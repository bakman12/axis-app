import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { CryptoProvider, useCrypto } from '@/lib/CryptoContext';
import AutoLock from '@/lib/AutoLock';
import ScreenGuard from '@/lib/ScreenGuard';
import BiometricGate from '@/components/BiometricGate';
import { useEffect, useState } from 'react';
import { createNotificationChannel, requestNotificationPermission, scheduleAllMedicationNotifications, registerNotificationActions } from '@/lib/NotificationService';
import { useNotificationActions } from '@/lib/useNotificationActions';
import { entities } from '@/lib/encryptedBase44Client';
import Onboarding, { hasCompletedOnboarding } from '@/components/Onboarding';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const { isUnlocked, directUnlock } = useCrypto();
  const isNativeShell = window.Capacitor?.isNativePlatform?.() ?? false;

  // On first unlock each session: set up notification channels, request permission,
  // and re-schedule all medication reminders (handles reinstalls / OS clearing alarms).
  useEffect(() => {
    if (!isUnlocked) return;
    (async () => {
      await createNotificationChannel();
      await registerNotificationActions();
      const granted = await requestNotificationPermission();
      if (granted) {
        const meds = await entities.Medication.filter({ active: true });
        await scheduleAllMedicationNotifications(meds);
      }
    })();
  }, [isUnlocked]);

  // Handle "Mark Taken" taps from the notification shade
  useNotificationActions();

  if (!isUnlocked) return <BiometricGate onUnlocked={directUnlock} />;

  // On native, API loading can hang indefinitely if offline — don't block the UI.
  if (!isNativeShell && (isLoadingPublicSettings || isLoadingAuth)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    // On native Capacitor, redirecting to a web login page breaks the app — fall through
    // to the app content which works offline via the local entity cache.
    const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
    if (authError.type === 'auth_required' && !isNative) { navigateToLogin(); return null; }
  }

  return (
    <>
      <AutoLock />
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};

function App() {
  const [onboarded, setOnboarded] = useState(() => hasCompletedOnboarding());

  // Show onboarding before anything else on first launch
  if (!onboarded) return <Onboarding onComplete={() => setOnboarded(true)} />;

  return (
    <CryptoProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScreenGuard />
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </CryptoProvider>
  );
}

export default App;
