import React, { createContext, useContext, useState, useEffect } from 'react';
import socketManager from '../../services/useAegisSocket';

const AuraContext = createContext();

const AURA_STATES = {
  CORE: {
    accent: '#3b82f6', // Standard Blue
    glow: 'rgba(59, 130, 246, 0.3)',
    name: 'NORMAL_OPS',
    description: 'Stabilized network environment.'
  },
  STEALTH: {
    accent: '#a855f7', // Purple
    glow: 'rgba(168, 85, 247, 0.3)',
    name: 'STEALTH_CONDUIT',
    description: 'Secure VPN tunnel active.'
  },
  SURGE: {
    accent: '#22d3ee', // Electric Cyan
    glow: 'rgba(34, 211, 238, 0.3)',
    name: 'SURGE_MODE',
    description: 'High-power state: System Charging.'
  },
  ALERT: {
    accent: '#ef4444', // Red
    glow: 'rgba(239, 68, 68, 0.3)',
    name: 'ADVERSARY_DETECTED',
    description: 'Threat activity detected.'
  },
  CAUTION: {
    accent: '#f59e0b', // Amber
    glow: 'rgba(245, 158, 11, 0.3)',
    name: 'UNTRUSTED_NODE',
    description: 'Public/Insecure network interface.'
  }
};
export function AuraProvider({ children }) {
  const [aura, setAura] = useState(AURA_STATES.CORE);
  const [intensity, setIntensity] = useState(0.2); // 0.0 to 1.0 baseline
  const [sensors, setStatus] = useState({
    vpn: false,
    charging: false,
    battery: 1,
    location: null,
    stats: { active_threats: 0 }
  });

  useEffect(() => {
    let eventAccumulator = 0;

    const unsubLoc = socketManager.subscribe('LOCATION', (data) => {
      eventAccumulator++;
      if (data) {
        setStatus(prev => ({ 
          ...prev, 
          vpn: data.vpn_active ?? prev.vpn, 
          location: data.city 
        }));
      }
    });

    const unsubTel = socketManager.subscribe('TELEMETRY', (data) => {
      eventAccumulator++;
      const contextVpn = data?.context?.vpn_active;
      if (contextVpn !== undefined) {
         setStatus(prev => ({ ...prev, vpn: contextVpn }));
      }
    });

    const unsubStats = socketManager.subscribe('STATS', (data) => {
      eventAccumulator++;
      const activeThreats = data?.active_threats;
      if (activeThreats !== undefined) {
         setStatus(prev => ({ 
            ...prev, 
            stats: { ...prev.stats, active_threats: activeThreats }
         }));
      }
    });

    // 2. Intensity Pulse - calculate event rate over 5s windows
    const intensityInterval = setInterval(() => {
        const rate = eventAccumulator / 5;
        const normalized = Math.min(Math.max(rate / 10, 0.1), 1.0); // baseline 0.1, maxes at 10 events/sec
        setIntensity(normalized);
        eventAccumulator = 0;
    }, 5000);

    // 3. Battery Sensor
    let batteryInstance = null;
    if ('getBattery' in navigator) {
      navigator.getBattery().then(batt => {
        batteryInstance = batt;
        const updateBattery = () => {
          setStatus(prev => ({ 
            ...prev, 
            charging: batt.charging,
            battery: batt.level
          }));
        };
        updateBattery();
        batt.addEventListener('chargingchange', updateBattery);
        batt.addEventListener('levelchange', updateBattery);
      });
    }

    // Initial State Sync — handled automatically by WebSocket cached delivery
    // socketManager.subscribe() delivers cached data on subscription if available

    return () => {
      unsubLoc();
      unsubTel();
      unsubStats();
      clearInterval(intensityInterval);
      if (batteryInstance) {
        // Cleaning up listeners
      }
    };
  }, []);

  // Aura Resolver
  useEffect(() => {
    let nextAura = AURA_STATES.CORE;

    // 1. Check for Active Threats (Priority 1)
    const activeThreats = sensors.stats?.active_threats > 0;

    // 2. Prioritization Logic: Alert > Stealth > Surge > Core
    if (activeThreats) {
      nextAura = AURA_STATES.ALERT;
    } else if (sensors.vpn) {
      nextAura = AURA_STATES.STEALTH;
    } else if (sensors.charging) {
      nextAura = AURA_STATES.SURGE;
    }

    // 3. Regional/Flag Awareness (Comprehensive mapping)
    const regionalPalettes = {
      'Japan': { accent: '#ef4444', glow: 'rgba(239, 68, 68, 0.2)', name: 'NIPPON_HUE' },
      'UK': { accent: '#3b82f6', glow: 'rgba(239, 68, 68, 0.2)', name: 'BRITANNIA_SHIFT' }, // Red-White-Blue blend
      'Germany': { accent: '#f59e0b', glow: 'rgba(0, 0, 0, 0.4)', name: 'DEUTSCHLAND_GLOW' },
      'USA': { accent: '#f8fafc', glow: 'rgba(59, 130, 246, 0.2)', name: 'STATESIDE_HUE' },
      'India': { accent: '#f97316', glow: 'rgba(34, 197, 94, 0.2)', name: 'BHARAT_VIBE' },
      'France': { accent: '#3b82f6', glow: 'rgba(255, 255, 255, 0.2)', name: 'GAUL_AURA' },
      'China': { accent: '#ef4444', glow: 'rgba(234, 179, 8, 0.2)', name: 'CELESTIAL_RED' },
      'Netherlands': { accent: '#f97316', glow: 'rgba(30, 58, 138, 0.2)', name: 'ORANJE_ENGINE' }
    };

    const countryName = sensors.location ? sensors.location.split(',').pop().trim() : null;
    const regionalTheme = regionalPalettes[countryName] || regionalPalettes[sensors.location];

    if (sensors.vpn && regionalTheme) {
        // Blend VPN Purple with Regional Accents
        nextAura = {
            ...nextAura,
            accent: regionalTheme.accent,
            glow: regionalTheme.glow,
            name: `${nextAura.name}_${regionalTheme.name}`
        };
    } else if (!sensors.vpn && regionalTheme && nextAura === AURA_STATES.CORE) {
        // Subtle hint for non-vpn location
        nextAura = { ...nextAura, ...regionalTheme };
    }

    setAura(nextAura);

    // Apply Aura to the Root Element
    const root = document.documentElement;
    root.style.setProperty('--color-accent', nextAura.accent);
    root.style.setProperty('--color-border-glow', nextAura.glow);
    
    console.log(`[AuraEngine] Switch -> ${nextAura.name} | Condition: ${activeThreats ? 'ALERT' : sensors.vpn ? 'VPN' : sensors.charging ? 'CHARGING' : sensors.location || 'BASE'}`);
  }, [sensors]);

  return (
    <AuraContext.Provider value={{ aura, sensors, intensity }}>
      <div className="contents transition-all duration-[800ms] ease-in-out">
        {children}
      </div>
    </AuraContext.Provider>
  );
}

export const useAura = () => useContext(AuraContext);
