"""
AegisAI v4.1 — Dynamic Location Engine
Polls public IP and geolocates the node to provide real-time network context and VPN awareness.
"""

import asyncio
import requests
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from backend.engine.normalization import AegisEvent
from backend.engine.stream_manager import ws_manager

class LocationEngine:
    CACHE_TTL = 300  # 5-minute TTL for geo cache

    def __init__(self, interval: int = 120):
        self.interval = interval
        self.baseline: Optional[Dict[str, Any]] = None
        self.current: Optional[Dict[str, Any]] = None
        self.last_ip: Optional[str] = None
        self.cache: Dict[str, Dict[str, Any]] = {}  # ip -> geo data
        self._cache_times: Dict[str, float] = {}     # ip -> timestamp
        self._last_ip_check: float = 0.0
        self._running = False

    def _cache_valid(self, ip: str) -> bool:
        """Check if cached geo data for an IP is still within TTL."""
        import time
        if ip not in self.cache or ip not in self._cache_times:
            return False
        return (time.time() - self._cache_times[ip]) < self.CACHE_TTL

    async def get_geo_info(self, ip: str) -> Optional[Dict[str, Any]]:
        """Fetch geolocation info for a given IP with TTL-based caching."""
        import time
        if self._cache_valid(ip):
            return self.cache[ip]

        try:
            response = await asyncio.to_thread(
                requests.get, f"http://ip-api.com/json/{ip}", timeout=2
            )
            data = response.json()
            if data.get("status") == "success":
                geo = {
                    "ip": ip,
                    "city": data.get("city"),
                    "country": data.get("country"),
                    "lat": data.get("lat"),
                    "lon": data.get("lon"),
                    "isp": data.get("isp"),
                    "as": data.get("as"),
                }
                self.cache[ip] = geo
                self._cache_times[ip] = time.time()
                return geo
        except Exception as e:
            print(f"[LocationEngine] Geo lookup failed: {e}")
        # Return stale cache on failure instead of None
        return self.cache.get(ip)

    async def get_public_ip(self) -> Optional[str]:
        """Fetch the current public IP with cached fallback."""
        try:
            response = await asyncio.to_thread(
                requests.get, "https://api.ipify.org?format=json", timeout=2
            )
            return response.json().get("ip")
        except Exception as e:
            print(f"[LocationEngine] IP discovery failed: {e}")
        return self.last_ip  # Return cached IP on failure

    def detect_vpn(self, current: Dict[str, Any]) -> bool:
        """Heuristic to detect if VPN is active based on baseline shift or ISP keywords."""
        if not current:
            return False
            
        isp = (current.get("isp") or "").lower()
        as_info = (current.get("as") or "").lower()
        
        # 1. Known VPN/Proxy/Cloud ISP Keywords
        vpn_keywords = [
            "vpn", "proxy", "host", "cloud", "digitalocean", "amazon", "google", 
            "ovh", "m247", "packethub", "datacenter", "nord", "mullvad", 
            "surfshark", "express", "proton", "clash"
        ]
        
        for kw in vpn_keywords:
            if kw in isp or kw in as_info:
                return True

        if not self.baseline:
            return False
        
        # 2. Baseline Shift Detection
        isp_changed = current.get("isp") != self.baseline.get("isp")
        country_changed = current.get("country") != self.baseline.get("country")
        
        return isp_changed or country_changed

    async def start(self):
        """Start the background location monitoring loop."""
        if self._running:
            return
        self._running = True
        asyncio.create_task(self._run_loop())

    async def _run_loop(self):
        print("[LocationEngine] Starting network context monitor...")
        while self._running:
            try:
                ip = await self.get_public_ip()
                if ip and ip != self.last_ip:
                    geo = await self.get_geo_info(ip)
                    if geo:
                        if not self.baseline:
                            self.baseline = geo
                            print(f"[LocationEngine] Baseline established: {geo['city']}, {geo['country']} ({geo['isp']})")
                        
                        self.current = geo
                        self.last_ip = ip
                        
                        vpn_status = self.detect_vpn(geo)
                        
                        # Broadcast update via SSE
                        await ws_manager.broadcast_channel("LOCATION", {
                            **geo,
                            "vpn_active": vpn_status,
                            "is_baseline": geo == self.baseline
                        }, force=True)
                        print(f"[LocationEngine] Location update: {geo['city']} | VPN: {vpn_status}")

            except Exception as e:
                print(f"[LocationEngine] Monitor loop error: {e}")
            
            await asyncio.sleep(self.interval)

    def stop(self):
        self._running = False

# Global Instance
location_engine = LocationEngine()
