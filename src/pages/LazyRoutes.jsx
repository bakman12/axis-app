import { lazy, Suspense } from 'react';

// Lazy load pages
export const Home = lazy(() => import('./Home'));
export const Analytics = lazy(() => import('./Analytics'));
export const Settings = lazy(() => import('./Settings'));

// Loading fallback
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
    </div>
  );
}

// Wrapper component
export function LazyPage({ children }) {
  return (
    <Suspense fallback={<PageLoader />}>
      {children}
    </Suspense>
  );
}