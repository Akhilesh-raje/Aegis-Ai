# pyre-ignore-all-errors[21]
import psutil
import time
import subprocess
import urllib.request
import json
import threading
from typing import Any, Optional, Dict, List, cast, TypedDict

class NetworkInterface(TypedDict):
    name: str
    ip: str

class NetworkContext(TypedDict):
    public_ip: str
    isp: str
    location: str
    vpn_active: bool
    interfaces: List[NetworkInterface]
# Try importing speedtest, handle if it fails during fast loops
try:
    import speedtest  # type: ignore
    _st = speedtest.Speedtest()
    _st_available = True
except Exception as e:
    _st_available = False

class TelemetryEngine:
    def __init__(self):
        self.last_net_io = psutil.net_io_counters()
        self.last_net_time = time.time()
        self.cached_speed = {"download": 0, "upload": 0, "ping": 0}
        self.last_speed_time = 0
        self.cached_network_context: Optional[Any] = None
        self.last_context_time: float = 0.0
        
        # Start background thread to fetch slow data
        self._start_background_context_fetcher()

    def _start_background_context_fetcher(self):
        def fetch_loop():
            while True:
                try:
                    self._refresh_network_context()
                except Exception as e:
                    print(f"[Telemetry] Background fetch failed: {e}")
                time.sleep(300) # Every 5 minutes
        
        thread = threading.Thread(target=fetch_loop, daemon=True)
        thread.start()

    def _refresh_network_context(self):
        """Fetches public IP, Geo, ISP, and local interfaces."""
        context: Dict[str, Any] = {}
        context["public_ip"] = "Unknown"
        context["isp"] = "Unknown"
        context["location"] = "Unknown"
        context["vpn_active"] = False
        
        interfaces: List[Dict[str, Any]] = []

        
        # 1. External IP & Location via ip-api (free, no auth)
        try:
            req = urllib.request.Request("http://ip-api.com/json/", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                if data.get("status") == "success":
                    context["public_ip"] = data.get("query", "Unknown")
                    context["isp"] = data.get("isp", "Unknown")
                    city = data.get("city", "")
                    countryCode = data.get("countryCode", "")
                    context["location"] = f"{city}, {countryCode}".strip(", ")
        except Exception as e:
            print(f"[Telemetry] IP-API failed: {e}")

        # 2. Local network interfaces and VPN heuristic
        try:
            # We look at active connections in psutil to guess VPN presence 
            # (Checking adapter names requires ipconfig/powershell, we'll do a basic check)
            addrs = psutil.net_if_addrs()
            stats = psutil.net_if_stats()
            vpn_keywords = ['tailscale', 'wireguard', 'tap', 'tun', 'vpn', 'openvpn', 'nord', 'expressvpn']
            
            for interface_name, addrs_list in addrs.items():
                is_up = stats.get(interface_name, None)
                if is_up and is_up.isup:
                    for addr in addrs_list:
                        # IPv4 only
                        if addr.family == 2:
                            interfaces.append({
                                "name": interface_name,
                                "ip": addr.address
                            })
                            # VPN Heuristic check
                            if any(k in interface_name.lower() for k in vpn_keywords):
                                context["vpn_active"] = True
        except Exception as e:
            print(f"[Telemetry] Interface parsing failed: {e}")

        context["interfaces"] = interfaces
        self.cached_network_context = cast(Any, context)
        self.last_context_time = time.time()

    def get_system_stats(self):
        """Returns real-time CPU, RAM, and Disk metrics."""
        cpu_percent = psutil.cpu_percent(interval=None) # Non-blocking
        ram = psutil.virtual_memory()
        
        return {
            "cpu_usage": cpu_percent,
            "ram_usage": ram.percent,
            "ram_total_gb": round(ram.total / (1024**3), 2),
            "ram_used_gb": round(ram.used / (1024**3), 2),
        }

    def get_network_io(self):
        """Calculates current network upload/download speeds in Mbps."""
        current_io = psutil.net_io_counters()
        current_time = time.time()
        
        dt = current_time - self.last_net_time
        if dt <= 0.05: 
            dt = 1.0 # If requested too fast, assume 1 sec interval to avoid Infinity spikes
        
        # Bytes per second -> Megabits per second
        up_speed = ((current_io.bytes_sent - self.last_net_io.bytes_sent) * 8) / (1024 * 1024 * dt)
        down_speed = ((current_io.bytes_recv - self.last_net_io.bytes_recv) * 8) / (1024 * 1024 * dt)
        
        # Ignore spurious massive spikes if psutil counters wrap around or restart
        if up_speed > 100000: up_speed = 0
        if down_speed > 100000: down_speed = 0
        
        self.last_net_io = current_io
        self.last_net_time = current_time
        
        return {
            "upload_mbps": round(max(0, up_speed), 2),
            "download_mbps": round(max(0, down_speed), 2),
        }

    def get_internet_speed(self):
        """Runs a real speedtest. This is slow, so we cache it for 5 minutes."""
        current_time = time.time()
        # Only run every 5 minutes (300 seconds) to avoid blocking or rate limits
        if _st_available and (current_time - self.last_speed_time > 300):
            try:
                _st.get_best_server()
                dl = _st.download() / (1024 * 1024) # Mbps
                ul = _st.upload() / (1024 * 1024)   # Mbps
                ping = _st.results.ping
                self.cached_speed = {
                    "download": round(dl, 2),
                    "upload": round(ul, 2),
                    "ping": round(ping, 2)
                }
                self.last_speed_time = current_time
            except Exception as e:
                print(f"[Telemetry] Speedtest failed: {e}")
        
        return self.cached_speed

    def get_network_context(self):
        """Returns the periodically cached networking context."""
        if not self.cached_network_context:
            self._refresh_network_context()
        return self.cached_network_context

    def get_os_logs(self):
        """Runs a swift powershell command to get recent Windows System/Security logs."""
        try:
            # Note: We query the last 15 Application events to avoid blocking powershell too long
            cmd = ['powershell', '-NoProfile', '-Command', 
                   'Get-EventLog -LogName Application -Newest 15 | Select-Object TimeGenerated, EntryType, Source, Message | ConvertTo-Json']
            
            # Using creationflags=subprocess.CREATE_NO_WINDOW (0x08000000) prevents powershell from flashing
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=3, creationflags=0x08000000)
            
            if result.returncode == 0 and result.stdout.strip():
                logs: List[Dict[str, Any]] = json.loads(result.stdout)
                if isinstance(logs, dict): # If only 1 result, powershell returns obj, not array
                    logs = [logs]
                
                parsed_logs = []
                for _log in logs:
                    log: Any = _log
                    # Powershell time format: "/Date(1773256354000)/"
                    raw_time = log["TimeGenerated"] if "TimeGenerated" in log else ""
                    ts = time.time()
                    if raw_time and raw_time.startswith("/Date(") and raw_time.endswith(")/"):
                        ms = int(raw_time.replace("/Date(", "").replace(")/", ""))
                        ts = ms / 1000.0
                    
                    # Convert EntryType numbers to strings
                    level = "INFO"
                    etype = log["EntryType"] if "EntryType" in log else None
                    if etype == 1: level = "ERROR"
                    elif etype == 2: level = "WARNING"
                    
                    log_msg: str = str(log["Message"]) if "Message" in log else ""
                    # Manual truncation loop to avoid slicing overload issues
                    truncated_msg: str = ""
                    limit = 200
                    for char in log_msg:
                        if len(truncated_msg) < limit:
                            truncated_msg += char
                        else:
                            break
                    if len(log_msg) > limit:
                        truncated_msg += "..."
                    
                    parsed_logs.append({
                        "timestamp": ts,  # type: ignore
                        "level": level,
                        "source": log["Source"] if "Source" in log else "System",  # type: ignore
                        "message": truncated_msg
                    })
                return parsed_logs
            return []
            
        except subprocess.TimeoutExpired:
            print("[Telemetry] OS logs fetch timeout")
            return []
        except Exception as e:
            print(f"[Telemetry] OS logs fetch failed: {e}")
            return []

    def get_active_processes(self, limit: int = 15):
        """Fetches top processes by CPU and memory usage."""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent']):
            try:
                processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Sort by CPU usage and take top N
        processes.sort(key=lambda x: x.get('cpu_percent', 0), reverse=True)
        return [processes[i] for i in range(min(len(processes), limit))]

    def get_active_connections(self, limit: int = 20):
        """Fetches active network connections (netstat style)."""
        connections = []
        try:
            # kind='inet' usually covers both, but 'all' is safer for some OS environments
            for conn in psutil.net_connections(kind='inet'):
                laddr = f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else "N/A"
                raddr = f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else "LISTEN"
                connections.append({
                    "fd": conn.fd,
                    "family": str(conn.family),
                    "type": str(conn.type),
                    "local_address": laddr,
                    "remote_address": raddr,
                    "status": conn.status,
                    "pid": conn.pid
                })
        except (psutil.AccessDenied, Exception):
            pass
        
        return [connections[i] for i in range(min(len(connections), limit))]

    def get_active_users(self):
        """Fetches currently logged-in OS users."""
        users = []
        try:
            for user in psutil.users():
                users.append({
                    "name": user.name,
                    "terminal": user.terminal,
                    "host": user.host,
                    "started": user.started
                })
        except Exception:
            pass
        return users

    def get_full_telemetry(self):
        """Aggregates all telemetry data for the dashboard."""
        return {
            "system": self.get_system_stats(),
            "network_io": self.get_network_io(),
            "context": self.get_network_context(),
            "os_logs": self.get_os_logs(),
            "processes": self.get_active_processes(),
            "connections": self.get_active_connections(),
            "users": self.get_active_users()
        }
