import { Link, useLocation } from 'react-router-dom';
import { Home, TrendingUp, Settings, Pill, Trophy, Heart } from 'lucide-react';
import { createPageUrl } from './utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEffect } from 'react';
import OfflineIndicator from './components/OfflineIndicator';
import OfflineDataManager from './components/OfflineDataManager';
import NavigationManager from './components/NavigationManager';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 1000 * 60 * 5
  });
  
  useEffect(() => {
    const theme = user?.theme || 'light';
    
    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [user?.theme]);

  useEffect(() => {
    if (user?.disable_system_gestures) {
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
      document.body.style.webkitOverflowScrolling = 'auto';
    } else {
      document.body.style.overscrollBehavior = 'auto';
      document.documentElement.style.overscrollBehavior = 'auto';
      document.body.style.webkitOverflowScrolling = 'touch';
    }
  }, [user?.disable_system_gestures]);
  
  const navItems = [
    { name: 'Home', icon: Home, path: createPageUrl('Home') },
    { name: 'Meds', icon: Pill, path: createPageUrl('Medications') },
    { name: 'Coach', icon: Heart, path: createPageUrl('HealthCoach') },
    { name: 'Progress', icon: Trophy, path: createPageUrl('Progress') },
    { name: 'Settings', icon: Settings, path: createPageUrl('Settings') }
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavClick = (e, path) => {
    if (isActive(path)) {
      e.preventDefault();
      // Scroll to top when tapping active tab
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-slate-950" style={{ minHeight: '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Offline Support */}
      <OfflineDataManager />
      <OfflineIndicator />
      <NavigationManager />
      
      {/* Main Content - No transitions for instant native feel */}
      <div className="pb-20" style={{ minHeight: '100dvh' }}>
        {children}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200/50 dark:border-gray-800/50 z-50 select-none shadow-lg dark:shadow-gray-950/50 overflow-x-auto" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}>
        <div className="flex items-center justify-around h-16 min-w-max px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={(e) => handleNavClick(e, item.path)}
                preventScrollReset={true}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors min-h-[44px] ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} />
                <span className="text-xs mt-1 font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}