import { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, CalendarDays } from 'lucide-react';

export default function DVRControls() {
  const [isDvrMode, setIsDvrMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(100);

  if (!isDvrMode) {
    return (
      <button 
        onClick={() => setIsDvrMode(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 hover:bg-[var(--color-accent)]/20 border border-white/10 hover:border-[var(--color-accent)]/50 transition-all group"
      >
        <Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]" />
        <span className="text-[10px] font-bold text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] uppercase tracking-widest">Forensic DVR</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 rounded bg-red-500/10 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-2 text-red-400">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest">DVR Active</span>
      </div>

      <div className="h-4 w-px bg-red-500/20" />

      <div className="flex items-center gap-1">
        <button className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors">
          <SkipBack className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors">
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-3 ml-2">
        <div className="text-[10px] font-mono font-bold text-red-200">
           -02:14:31
        </div>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={progress}
          onChange={(e) => setProgress(e.target.value)}
          className="w-32 h-1 bg-red-950 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:rounded-full"
        />
        <div className="text-[10px] font-mono font-bold text-red-200">
           LIVE
        </div>
      </div>

      <div className="h-4 w-px bg-red-500/20 ml-2" />

      <button 
        onClick={() => setIsDvrMode(false)}
        className="ml-2 text-[9px] font-bold text-red-300 hover:text-white uppercase tracking-widest bg-red-500/20 px-2 py-1 rounded"
      >
        Exit DVR
      </button>
    </div>
  );
}
