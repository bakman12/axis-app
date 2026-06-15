// ProtectedRoute.tsx
// Guards routes that require authentication + MFA.
// Redirects to /login if no session, /mfa if session but MFA pending.

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthContext';

interface Props {
  children: React.ReactNode;
  requireRole?: 'admin' | 'clinician' | 'viewer';
}

export function ProtectedRoute({ children, requireRole }: Props) {
  const { session, clinician, isAuthorised, mfaPending, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="loading-spinner" aria-label="Loading" />
      </div>
    );
  }

  // Not logged in at all
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but MFA not completed
  if (mfaPending) {
    return <Navigate to="/mfa" state={{ from: location }} replace />;
  }

  // Session valid but clinician profile missing (not in any org)
  if (!clinician) {
    return <Navigate to="/login?error=no_profile" replace />;
  }

  // Clinician account deactivated
  if (!clinician.is_active) {
    return <Navigate to="/login?error=deactivated" replace />;
  }

  // Role check (optional)
  const roleOrder = { viewer: 0, clinician: 1, admin: 2 };
  if (requireRole && roleOrder[clinician.role] < roleOrder[requireRole]) {
    return <Navigate to="/dashboard?error=insufficient_permissions" replace />;
  }

  return <>{children}</>;
}
