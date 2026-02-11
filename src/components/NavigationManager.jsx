import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Manages independent state for each navigation tab
const tabStates = new Map();
const scrollPositions = new Map();

export function useTabState(pageName) {
  const location = useLocation();
  const isCurrentPage = location.pathname.includes(pageName);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (isCurrentPage) {
      // Restore scroll position when returning to this tab
      const savedScroll = scrollPositions.get(pageName) || 0;
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScroll);
      });
    }

    return () => {
      if (isCurrentPage) {
        // Save scroll position when leaving this tab
        scrollPositions.set(pageName, window.scrollY);
      }
    };
  }, [isCurrentPage, pageName]);

  return { isCurrentPage, mountedRef };
}

export function TabContainer({ pageName, children }) {
  const { isCurrentPage } = useTabState(pageName);

  return (
    <div
      style={{
        display: isCurrentPage ? 'block' : 'none',
        minHeight: '100dvh'
      }}
    >
      {children}
    </div>
  );
}

export default function NavigationManager() {
  const location = useLocation();

  useEffect(() => {
    // Save current scroll position for the current page
    const currentPath = location.pathname;
    
    return () => {
      scrollPositions.set(currentPath, window.scrollY);
    };
  }, [location.pathname]);

  return null;
}