import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Activity as ActivityIcon } from 'lucide-react';
import { useAegisSocket } from '../../services/useAegisSocket';

export default function TrafficGraph({ simPhase, activeAttack }) {
  const [history, setHistory] = useState([]);

  const { data } = useAegisSocket('TELEMETRY');

  useEffect(() => {
    if (!data?.network_io && simPhase !== 'attacking') return;
    setHistory((prev) => {
      let dl = data?.network_io?.download_mbps || 0;
      let ul = data?.network_io?.upload_mbps || 0;
      
      if (simPhase === 'attacking') {
         dl = 800 + Math.random() * 400;
         ul = 500 + Math.random() * 200;
      }
      
      const next = [
        ...prev,
        {
          time: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }),
          download: dl,
          upload: ul,
        },
      ];
      return next.slice(-20);
    });
  }, [data, simPhase]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#111827] border border-white/20 rounded-lg px-4 py-3 text-xs shadow-2xl backdrop-blur-md">
        <div className="text-[#9CA3AF] font-bold font-mono mb-2">{payload[0]?.payload?.time}</div>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-6 font-mono font-bold" style={{ color: p.color }}>
            <span className="uppercase tracking-wider">{p.name}:</span>
            <span>{p.value.toFixed(1)} MBPS</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="card-glow p-5 flex flex-col h-full bg-[#0B0F1A] hover:border-[#22D3EE]/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4 shrink-0">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/15 flex items-center justify-center border border-[#22D3EE]/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
              <ActivityIcon className="w-5 h-5 text-[#22D3EE]" />
           </div>
           <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">IO Throughput</h3>
              <p className="text-xs text-[#9CA3AF] font-mono">Network Saturation</p>
           </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono font-black uppercase">
          <span className="flex items-center gap-1.5 text-[#22D3EE]">
            <span className="w-2 h-2 rounded-full bg-[#22D3EE] shadow-[0_0_8px_#22d3ee]"></span>
            DL: {(simPhase === 'attacking' ? 1200 : data?.network_io?.download_mbps || 0).toFixed(1)}
          </span>
          <span className="flex items-center gap-1.5 text-[#A855F7]">
            <span className="w-2 h-2 rounded-full bg-[#A855F7] shadow-[0_0_8px_#a855f7]"></span>
            UL: {(simPhase === 'attacking' ? 700 : data?.network_io?.upload_mbps || 0).toFixed(1)}
          </span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
          <defs>
            <linearGradient id="colorDl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#22D3EE" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorUl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#A855F7" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 700, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            dy={10}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 700, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            width={35}
            tickFormatter={(v) => `${v.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="download"
            name="Download"
            stroke={simPhase === 'attacking' ? '#EF4444' : '#22D3EE'}
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorDl)"
            animationDuration={500}
          />
          <Area
            type="monotone"
            dataKey="upload"
            name="Upload"
            stroke={simPhase === 'attacking' ? '#F59E0B' : '#A855F7'}
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorUl)"
            animationDuration={500}
          />
        </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
