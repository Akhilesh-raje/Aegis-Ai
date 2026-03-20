import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAegisSocket } from '../../services/useAegisSocket';

// Constants for Earth mapping
const EARTH_RADIUS = 5;

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

const GEO_COORDS = {
  'Russia': [55, 37],
  'China': [116, 39],
  'Germany': [13, 52],
  'Nigeria': [3, 6],
  'Brazil': [-43, -22],
  'Iran': [51, 35],
  'North Korea': [125, 39],
  'India': [77, 28],
};

function AttackArc({ from, to, color = '#ef4444' }) {
  const lineRef = useRef();
  const [dashOffset, setDashOffset] = useState(0);

  const curve = useMemo(() => {
    const start = latLonToVector3(from[0], from[1], EARTH_RADIUS);
    const end = latLonToVector3(to[0], to[1], EARTH_RADIUS);
    
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const distance = start.distanceTo(end);
    mid.setLength(EARTH_RADIUS + distance * 0.4);

    return new THREE.QuadraticBezierCurve3(start, mid, end);
  }, [from, to]);

  const points = curve.getPoints(50);
  
  useFrame(() => {
    if (lineRef.current) {
      lineRef.current.material.dashOffset -= 0.01;
    }
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineDashedMaterial 
        attach="material" 
        color={color} 
        dashSize={0.2} 
        gapSize={0.1}
        linewidth={2} 
        transparent 
        opacity={0.8} 
      />
    </line>
  );
}

function Globe({ threats, systemLoc, vpnActive }) {
  const globeRef = useRef();
  const atmosphereRef = useRef();
  
  useFrame((state) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.0015;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += 0.001;
    }
  });

  const attackOrigins = useMemo(() => (threats || [])
    .filter((t) => t.geo && GEO_COORDS[t.geo])
    .map((t) => ({
      coords: GEO_COORDS[t.geo],
      geo: t.geo,
      severity: t.severity,
    })), [threats]);

  return (
    <group>
      <group ref={globeRef}>
        {/* The Earth */}
        <Sphere args={[EARTH_RADIUS, 64, 64]}>
          <meshPhongMaterial
            color="#0ea5e9"
            emissive="#02142d"
            emissiveIntensity={0.5}
            wireframe={true}
            transparent
            opacity={0.1}
          />
        </Sphere>
        
        {/* Inner Solid Earth */}
        <Sphere args={[EARTH_RADIUS - 0.05, 32, 32]}>
          <meshPhongMaterial color="#0b1220" transparent opacity={0.9} />
        </Sphere>

        {/* Attack Arcs */}
        {attackOrigins.map((origin, i) => (
          <AttackArc 
            key={i} 
            from={origin.coords} 
            to={[systemLoc[1], systemLoc[0]]} 
            color={origin.severity === 'critical' ? '#ef4444' : '#f97316'} 
          />
        ))}

        {/* Origin Markers */}
        {attackOrigins.map((origin, i) => {
          const pos = latLonToVector3(origin.coords[0], origin.coords[1], EARTH_RADIUS);
          return (
            <group key={`m-${i}`} position={pos}>
              <mesh>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color={origin.severity === 'critical' ? '#ef4444' : '#f97316'} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* Atmospheric Glow (Outer) */}
      <Sphere ref={atmosphereRef} args={[EARTH_RADIUS * 1.05, 64, 64]}>
        <meshBasicMaterial 
          color="#38bdf8" 
          transparent 
          opacity={0.03} 
          side={THREE.BackSide} 
          wireframe
        />
      </Sphere>

      {/* System Node Marker (Non-rotating) */}
      {systemLoc && (
        <group position={latLonToVector3(systemLoc[1], systemLoc[0], EARTH_RADIUS)}>
          <mesh>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color={vpnActive ? '#a855f7' : '#0ea5e9'} />
          </mesh>
          <Html distanceFactor={10} zIndexRange={[100, 0]}>
            <div className="flex flex-col items-center pointer-events-none transform -translate-y-8">
              <div className={`w-3 h-3 rounded-full ${vpnActive ? 'bg-purple-500' : 'bg-sky-400'} animate-ping mb-1`} />
              <div className="px-2 py-0.5 bg-black/90 border border-white/20 rounded text-[7px] font-mono text-white whitespace-nowrap backdrop-blur-sm">
                {vpnActive ? '[VPN_ENCRYPTED]' : '[PRIMARY_NODE]'}
              </div>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

export default function TacticalGlobe() {
  const [trafficHistory, setTrafficHistory] = useState([]);
  const [systemLoc, setSystemLoc] = useState([-73.935, 40.73]); // Default NYC
  const [locationContext, setLocationContext] = useState(null);

  const { data: liveThreats } = useAegisSocket('THREATS');
  const threats = liveThreats ? liveThreats.slice(0, 8) : undefined;

  const { data: telemetry } = useAegisSocket('TELEMETRY');

  const { data: locData } = useAegisSocket('LOCATION');

  useEffect(() => {
    if (locData) {
      setSystemLoc([locData.lon, locData.lat]);
      setLocationContext(locData);
    }
  }, [locData]);

  return (
    <div className="card-glow scanline h-[460px] flex flex-col relative overflow-hidden bg-[#070b1a]">
      {/* Header Overlay */}
      <div className="absolute top-4 left-6 z-10 pointer-events-none">
        <h3 className="text-[10px] font-[var(--font-display)] font-bold tracking-[0.2em] text-[var(--color-text-muted)] uppercase mb-1">
          Global Tactical Overlay (3D Core)
        </h3>
        <div className="flex items-center gap-4 text-[9px] font-mono text-[var(--color-accent)]">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${locationContext?.vpn_active ? 'bg-purple-500' : 'bg-[var(--color-accent)]'} animate-pulse`} />
            NODE_{locationContext?.city?.toUpperCase().replace(' ', '_') || 'NYC_HQ'}
          </span>
          <span className="text-[var(--color-text-muted)]">|</span>
          <span>LAT: {systemLoc[1].toFixed(4)}° N, LON: {systemLoc[0].toFixed(4)}° W</span>
          {locationContext?.vpn_active && (
            <>
              <span className="text-[var(--color-text-muted)]">|</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[8px] font-bold">
                VPN_ACTIVE
              </span>
            </>
          )}
        </div>
      </div>

      {/* 3D Scene */}
      <div className="flex-1 min-h-0">
        <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Globe threats={threats} systemLoc={systemLoc} vpnActive={locationContext?.vpn_active} />
          <OrbitControls enablePan={false} enableZoom={true} minDistance={8} maxDistance={20} />
        </Canvas>
      </div>

      {/* HUD Info (ISP) */}
      <div className="absolute top-16 left-6 z-10 pointer-events-none">
        {locationContext?.isp && (
          <div className="text-[8px] font-mono text-[var(--color-text-muted)] mt-1 opacity-60">
            ISP: {locationContext.isp} | {locationContext.as || ''}
          </div>
        )}
      </div>

      {/* Floating Instructions */}
      <div className="absolute bottom-4 right-6 z-10 pointer-events-none text-[8px] font-mono text-[var(--color-text-muted)] opacity-40">
        DRAG TO ROTATE | SCROLL TO ZOOM
      </div>
    </div>
  );
}
