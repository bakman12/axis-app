import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export function usePremiumAccess() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const tier = user?.subscription_tier || 'free';
  const isTrialActive = user?.trial_ends_at && new Date(user.trial_ends_at) > new Date();
  
  return {
    tier,
    isFree: tier === 'free' && !isTrialActive,
    isPro: tier === 'pro' || tier === 'family' || isTrialActive,
    isFamily: tier === 'family' || isTrialActive,
    isTrialActive
  };
}

export default function PremiumGate({ feature, requiredTier = 'pro', children }) {
  const { tier, isPro, isFamily } = usePremiumAccess();
  
  const hasAccess = 
    (requiredTier === 'pro' && isPro) ||
    (requiredTier === 'family' && isFamily);

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-gray-400" />
          <CardTitle className="text-lg">Premium Feature</CardTitle>
        </div>
        <CardDescription>
          Upgrade to {requiredTier === 'family' ? 'Family' : 'Pro'} to unlock {feature}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link to={createPageUrl('Subscription')}>
          <Button className="w-full">
            <Crown className="w-4 h-4 mr-2" />
            Upgrade Now
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}