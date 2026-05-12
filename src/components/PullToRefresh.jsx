import { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 72;
const MAX_PULL = 96;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(null);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e) => {
    // Only activate pull-to-refresh when already at the very top
    if (window.scrollY > 2) return;
    startY.current = e.touches[0].clientY;
    pulling.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null || isRefreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) { startY.current = null; return; } // scrolling up — hand off to browser

    pulling.current = true;
    // Apply resistance: pull feels heavier as it extends
    setPullY(Math.min(delta * 0.45, MAX_PULL));
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    startY.current = null;
    pulling.current = false;

    if (pullY >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      try { await onRefresh(); } finally {
        setIsRefreshing(false);
      }
    }
    setPullY(0);
  }, [pullY, isRefreshing, onRefresh]);

  const indicatorSize = isRefreshing ? THRESHOLD : pullY;
  const progress = Math.min(pullY / THRESHOLD, 1);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: indicatorSize > 8 ? indicatorSize : 0 }}
      >
        <RefreshCw
          className={`w-5 h-5 text-blue-600 dark:text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ opacity: progress, transform: `rotate(${progress * 270}deg)` }}
        />
      </div>
      {children}
    </div>
  );
}
