import { useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';

// Preserves scroll position and component state for each tab
export default function TabPreserver({ pageName, children }) {
  const location = useLocation();
  const scrollRef = useRef(0);
  const containerRef = useRef(null);
  const isActive = location.pathname === pageName;

  // Save scroll position when leaving
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      scrollRef.current = window.scrollY;
    };

    if (isActive) {
      window.addEventListener('scroll', handleScroll);
      // Restore scroll position
      window.scrollTo(0, scrollRef.current);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (isActive) {
        scrollRef.current = window.scrollY;
      }
    };
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      style={{
        display: isActive ? 'block' : 'none',
        minHeight: '100dvh'
      }}
    >
      {children}
    </div>
  );
}