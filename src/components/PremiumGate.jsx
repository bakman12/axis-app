// PremiumGate — all features are free during MVP; gate is disabled.
// Re-enable when subscription is added back.

export function usePremiumAccess() {
  return { tier: 'pro', isFree: false, isPro: true, isFamily: false, isTrialActive: false };
}

export default function PremiumGate({ children }) {
  return <>{children}</>;
}