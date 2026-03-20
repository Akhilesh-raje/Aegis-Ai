import { useState, useEffect, useRef } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Line as MapLine } from 'react-simple-maps';
import { AreaChart, Area } from 'recharts';
import { useAegisSocket } from '../../services/useAegisSocket';

const mapUrl = "https://raw.githubusercontent.com/lotusms/world-map-data/main/world.json";

export default function WorldMap({ simPhase, activeAttack }) {
  const [trafficHistory, setTrafficHistory] = useState([]);
  const [systemLoc, setSystemLoc] = useState([-73.935, 40.73]); // Default NYC
  const [locationContext, setLocationContext] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const chartContainerRef = useRef(null);
  const [chartDims, setChartDims] = useState({ w: 300, h: 60 });

  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => {
      if (chartContainerRef.current) {
        const w = chartContainerRef.current.clientWidth;
        const h = chartContainerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          setChartDims({ w, h });
        }
      }
    };
    
    handleResize();
    const ro = new ResizeObserver(handleResize);
    if (chartContainerRef.current) ro.observe(chartContainerRef.current);
    return () => ro.disconnect();
  }, []);

  const { data: liveThreats } = useAegisSocket('THREATS');
  
  const isAttacking = simPhase === 'attacking';
  const threats = isAttacking ? [
    { geo_lon: -122.4194, geo_lat: 37.7749 },
    { geo_lon: 37.6173, geo_lat: 55.7558 },
    { geo_lon: 116.4074, geo_lat: 39.9042 },
    { geo_lon: -0.1276, geo_lat: 51.5072 },
    { geo_lon: Math.random() * 180 - 90, geo_lat: Math.random() * 90 - 45 }
  ] : (liveThreats ? liveThreats.slice(0, 5) : undefined);

  const { data: telemetry } = useAegisSocket('TELEMETRY');
  const { data: locData } = useAegisSocket('LOCATION');

  useEffect(() => {
    if (locData?.lat && locData?.lon) {
      setSystemLoc([locData.lon, locData.lat]);
      setLocationContext(locData);
    }
  }, [locData]);

  useEffect(() => {
    if (!telemetry?.network_io) return;
    setTrafficHistory(prev => {
      const next = [...prev, { val: telemetry.network_io.download_mbps || 0 }];
      return next.slice(-40);
    });
  }, [telemetry]);

  if (!isMounted) return <div className="h-full bg-[#0B0F1A] animate-pulse rounded-lg" />;

  return (
    <div className="card-glow bg-[#0B0F1A] p-5 relative group overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Geo Tactical Overlay</h3>
          <p className="text-xs text-[#9CA3AF] font-mono uppercase tracking-widest mt-1">Node: {locationContext?.city || 'Detecting...'}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold shadow-[0_0_10px_rgba(34,211,238,0.15)] ${isAttacking ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30' : 'bg-[#22D3EE]/10 text-[#22D3EE] border-[#22D3EE]/30'}`}>
          {isAttacking ? 'CRITICAL_BARRAGE_DETECTED' : 'SECURE_NODE_V4'}
        </div>
      </div>

      <div className="flex-1 relative min-h-[180px] bg-[#111827] rounded-xl border border-white/10 overflow-hidden group-hover:border-[#22D3EE]/30 transition-all duration-500">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 120 }}
          style={{ width: "100%", height: "100%" }}
        >
          <Geographies geography={mapUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1F2937"
                  stroke="#374151"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#374151", outline: "none" }
                  }}
                />
              ))
            }
          </Geographies>

          {threats && Array.isArray(threats) && threats.map((threat, i) => (
            <Marker key={i} coordinates={[threat.geo_lon || -74.006, threat.geo_lat || 40.7128]}>
              <circle r={3} fill="#EF4444" className="animate-pulse" shadow="0 0 10px #EF4444" />
              <MapLine
                from={systemLoc}
                to={[threat.geo_lon || -74.006, threat.geo_lat || 40.7128]}
                stroke="#EF4444"
                strokeWidth={1}
                strokeDasharray="4 4"
                className="opacity-40"
              />
            </Marker>
          ))}

          <Marker coordinates={systemLoc}>
            <g transform="translate(-6, -6)">
              <circle r={6} fill="#22D3EE" className="animate-ping" opacity={0.4} />
              <circle r={3} fill="#22D3EE" />
            </g>
          </Marker>
        </ComposableMap>

        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center bg-[#0B0F1A]/90 backdrop-blur-md px-4 py-3 rounded-lg border border-white/10 pointer-events-none shadow-xl">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-widest mb-1">LAT / LON</span>
            <span className="text-xs text-[#22D3EE] font-mono font-bold tracking-wider">
              {systemLoc[1].toFixed(4)} / {systemLoc[0].toFixed(4)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-widest mb-1">ISP STATUS</span>
            <span className="text-xs text-[#10B981] font-mono font-bold uppercase tracking-wider">PROTECTED</span>
          </div>
        </div>
      </div>

      <div className="mt-5 shrink-0 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#22D3EE] shadow-[0_0_10px_#22d3ee] animate-pulse"></div>
                <span className="text-xs font-mono font-bold text-[#9CA3AF] uppercase tracking-widest">Ingress Packet Rate</span>
            </div>
            <div className="text-sm font-mono font-bold text-white">
                {(telemetry?.network_io?.download_mbps || 0).toFixed(1)} <span className="text-[#22D3EE]">PPS</span>
            </div>
        </div>
        <div ref={chartContainerRef} className="h-14 w-full min-h-[56px] overflow-hidden opacity-50 group-hover:opacity-100 transition-opacity duration-500">
            <AreaChart width={chartDims.w || 300} height={chartDims.h || 56} data={trafficHistory}>
              <defs>
                <linearGradient id="mapTraffic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="stepAfter"
                dataKey="val"
                stroke="#22D3EE"
                strokeWidth={2}
                fill="url(#mapTraffic)"
                isAnimationActive={false}
              />
            </AreaChart>
        </div>
      </div>
    </div>
  );
}
