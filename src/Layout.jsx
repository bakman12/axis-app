import { Link, useLocation } from 'react-router-dom';
import { Home, Settings, Pill, Plane, Trophy } from 'lucide-react';
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
    const theme = localStorage.getItem('axis_theme') || user?.theme || 'dark';
    // Sync to localStorage so it survives API failures
    if (user?.theme && !localStorage.getItem('axis_theme')) {
      localStorage.setItem('axis_theme', user.theme);
    }

    const apply = (t) =>
      document.documentElement.classList.toggle(
        'dark',
        t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches),
      );

    apply(theme);

    if (theme === 'auto') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e) => document.documentElement.classList.toggle('dark', e.matches);
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
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
    { name: 'Home',     icon: Home,     path: createPageUrl('Home') },
    { name: 'Meds',     icon: Pill,     path: createPageUrl('Medications') },
    { name: 'Travel',   icon: Plane,    path: createPageUrl('Travel') },
    { name: 'Progress', icon: Trophy,   path: createPageUrl('Progress') },
    { name: 'Settings', icon: Settings, path: createPageUrl('Settings') },
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
    <div className="fixed inset-0 bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <OfflineDataManager />
      <OfflineIndicator />
      <NavigationManager />

      {/* Scrollable content — explicit container gives Android WebView native-speed fling scrolling */}
      <div
        className="absolute inset-0 overflow-y-auto"
        style={{
          paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'none',
        }}
      >
        {children}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border z-50 select-none overflow-x-auto" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}>
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
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all min-h-[44px] ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] transition-transform ${active ? 'scale-110' : ''}`} />
                <span className="mt-1 font-medium" style={{ fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}