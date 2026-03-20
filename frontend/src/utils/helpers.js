import { useState, useEffect, useRef } from 'react';

export function useAnimatedValue(targetValue, duration = 800) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const diff = targetValue - start;
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(start + diff * eased);
      if (progress < 1) requestAnimationFrame(animate);
      else prevValue.current = targetValue;
    }

    requestAnimationFrame(animate);
  }, [targetValue, duration]);

  return displayValue;
}

export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num?.toFixed?.(1) ?? num;
}

export function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour12: false });
}

export function getSeverityColor(severity) {
  const colors = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#3b82f6',
    info: '#22c55e',
  };
  return colors[severity?.toLowerCase()] || '#64748b';
}

export function getRiskColor(level) {
  const colors = {
    LOW: '#22c55e',
    MEDIUM: '#f59e0b',
    HIGH: '#f97316',
    CRITICAL: '#ef4444',
  };
  return colors[level] || '#64748b';
}

export function timeAgo(timestamp) {
  let ts = timestamp;
  if (!ts) return 'Just now';
  
  if (typeof ts === 'string') {
    ts = new Date(ts).getTime() / 1000;
  } else if (ts > 1000000000000) {
    // Convert ms to seconds
    ts = ts / 1000;
  }
  
  const now = Date.now() / 1000;
  const seconds = Math.floor(now - ts);
  
  if (isNaN(seconds) || seconds < 0) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
