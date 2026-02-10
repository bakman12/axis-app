import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, TrendingUp, Settings } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { createPageUrl } from './utils';
import PageTransition from './components/PageTransition';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const navItems = [
    { name: 'Home', icon: Home, path: createPageUrl('Home') },
    { name: 'Analytics', icon: TrendingUp, path: createPageUrl('Analytics') },
    { name: 'Settings', icon: Settings, path: createPageUrl('Settings') }
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavClick = (e, path) => {
    if (isActive(path)) {
      e.preventDefault();
      // Reset to top and reload the route to reset state
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate(path, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Main Content */}
      <div className="pb-20">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            {children}
          </PageTransition>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 select-none" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}>
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={(e) => handleNavClick(e, item.path)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors min-h-[44px] ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Icon className={`w-6 h-6 ${active ? 'scale-110' : ''} transition-transform`} />
                <span className="text-sm mt-1 font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}