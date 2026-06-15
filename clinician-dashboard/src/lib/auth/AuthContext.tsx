// auth/AuthContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Provides Supabase session state, clinician profile, and MFA status to the
// entire dashboard. Wrap <App /> with <AuthProvider>.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { identifyClinician } from '../sentry';
import type { Session, User } from '@supabase/supabase-js';
import type { Tables } from '../supabaseClient';

type Clinician = Tables<'clinicians'> & { organisation: Tables<'organisations'> };

interface AuthState {
  session:    Session | null;
  user:       User | null;
  clinician:  Clinician | null;
  /** true = session exists + MFA verified (or org is on trial/no MFA required) */
  isAuthorised: boolean;
  /** true = session exists but MFA challenge still pending */
  mfaPending: boolean;
  isLoading:  boolean;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]       = useState<Session | null>(null);
  const [clinician, setClinician]   = useState<Clinician | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [mfaPending, setMfaPending] = useState(false);

  const loadClinician = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('clinicians')
      .select('*, organisation:organisations(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('loadClinician:', error?.message ?? 'no profile found');
      setClinician(null);
    } else {
      const c = data as Clinician;
      setClinician(c);
      // Identify clinician to Sentry by stable IDs only — never email.
      identifyClinician(c.id, c.org_id);
    }
  }, []);

  const checkMfaStatus = useCallback(async (currentSession: Session): Promise<boolean> => {
    // Supabase AAL: aal1 = password/magic-link only, aal2 = MFA verified
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const mfaRequired = !!currentSession.user.app_metadata?.mfa_required;
    const mfaVerified = data?.currentLevel === 'aal2';
    return mfaRequired ? mfaVerified : true;
  }, []);

  useEffect(() => {
    // Initialise from existing session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        await loadClinician(s.user.id);
        const verified = await checkMfaStatus(s);
        setMfaPending(!verified);
      }
      setIsLoading(false);
    });

    // Subscribe to auth state changes (magic-link callback, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      if (s?.user) {
        await loadClinician(s.user.id);
        const verified = await checkMfaStatus(s);
        setMfaPending(!verified);
      } else {
        setClinician(null);
        setMfaPending(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadClinician, checkMfaStatus]);

  const signInWithMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false, // clinicians must be pre-created by an admin
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const isAuthorised = !!session && !!clinician && !mfaPending;

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, clinician,
      isAuthorised, mfaPending, isLoading,
      signInWithMagicLink, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
