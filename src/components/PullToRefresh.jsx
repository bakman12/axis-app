import { useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const pullProgress = useTransform(y, [0, 80], [0, 1]);
  const rotate = useTransform(pullProgress, [0, 1], [0, 360]);

  const handleDragEnd = async (event, info) => {
    if (info.offset.y > 80 && !isRefreshing) {
      setIsRefreshing(true);
      animate(y, 60, { duration: 0.2 });
      
      try {
        await onRefresh();
      } finally {
        animate(y, 0, { duration: 0.3 });
        setTimeout(() => setIsRefreshing(false), 300);
      }
    } else {
      animate(y, 0, { duration: 0.3 });
    }
  };

  return (
    <div className="relative" style={{ touchAction: 'pan-y' }}>
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-50"
        style={{ y: useTransform(y, (val) => Math.max(0, val - 60)) }}
      >
        <motion.div
          className="bg-blue-600 dark:bg-blue-500 rounded-full p-2 shadow-lg"
          style={{
            opacity: pullProgress,
            scale: pullProgress,
            rotate: isRefreshing ? undefined : rotate
          }}
          animate={isRefreshing ? { rotate: 360 } : {}}
          transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
        >
          <RefreshCw className="w-5 h-5 text-white" />
        </motion.div>
      </motion.div>

      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        onDragEnd={handleDragEnd}
        style={{ y }}
      >
        {children}
      </motion.div>
    </div>
  );
}