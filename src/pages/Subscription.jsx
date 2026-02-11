import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Users, Sparkles, TrendingUp, Calendar, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';
import RootPageHeader from '../components/RootPageHeader';

const PRICING_TIERS = {
  pro: {
    name: 'Pro',
    price: '$4.99',
    period: '/month',
    icon: Crown,
    color: 'from-blue-500 to-indigo-600',
    features: [
      'Advanced AI insights & predictions',
      'Unlimited analytics history',
      'Personalized weekly challenges',
      'Export health reports (PDF)',
      'Priority support',
      'Ad-free experience'
    ]
  },
  family: {
    name: 'Family',
    price: '$9.99',
    period: '/month',
    icon: Users,
    color: 'from-purple-500 to-pink-600',
    features: [
      'Everything in Pro',
      'Up to 5 family profiles',
      'Caregiver dashboard',
      'Shared medication schedules',
      'Family adherence tracking',
      'Emergency contact alerts'
    ]
  }
};

export default function SubscriptionPage() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const subscription = subscriptions[0];
  const currentTier = user?.subscription_tier || 'free';
  const isTrialActive = user?.trial_ends_at && new Date(user.trial_ends_at) > new Date();
  const daysLeftInTrial = isTrialActive 
    ? Math.ceil((new Date(user.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  const upgradeMutation = useMutation({
    mutationFn: async (tier) => {
      // Check if running in iframe
      if (window.self !== window.top) {
        throw new Error('Checkout only works in published app. Please open app in new tab.');
      }

      const origin = window.location.origin;
      const { url } = await base44.functions.invoke('createCheckout', {
        tier,
        successUrl: `${origin}?checkout=success`,
        cancelUrl: `${origin}/subscription`
      });
      
      // Redirect to Stripe checkout
      window.location.href = url;
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({ subscription_tier: 'free' });
      if (subscription) {
        await base44.entities.Subscription.update(subscription.id, {
          status: 'cancelled',
          cancel_at_period_end: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription cancelled');
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-slate-950">
      <RootPageHeader
        title="Subscription"
        subtitle="Unlock premium features"
      />

      <div className="p-6 pb-24 max-w-4xl mx-auto space-y-6">
        {/* Current Plan */}
        {currentTier !== 'free' && (
          <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-blue-600" />
                    {PRICING_TIERS[currentTier]?.name} Plan
                  </CardTitle>
                  <CardDescription>
                    {isTrialActive 
                      ? `${daysLeftInTrial} days left in trial`
                      : subscription?.status === 'active' 
                        ? 'Active subscription'
                        : 'Trial ended'}
                  </CardDescription>
                </div>
                {subscription?.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                  >
                    Cancel Plan
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Free Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Free Forever
            </CardTitle>
            <CardDescription>Core medication tracking features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              'Unlimited medications',
              'Daily schedule & reminders',
              'Basic adherence tracking',
              'Medication calendar view',
              '30-day analytics history',
              'Gamification & streaks'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span>{feature}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Premium Tiers */}
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(PRICING_TIERS).map(([tier, details]) => {
            const Icon = details.icon;
            const isCurrentPlan = currentTier === tier;
            
            return (
              <Card key={tier} className={isCurrentPlan ? 'border-2 border-blue-500' : ''}>
                <CardHeader>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${details.color} text-white w-fit`}>
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold">{details.name}</span>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">{details.price}</span>
                    <span className="text-muted-foreground">{details.period}</span>
                  </div>
                  {isCurrentPlan && (
                    <Badge className="w-fit">Current Plan</Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {details.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  {!isCurrentPlan && (
                    <Button
                      className="w-full"
                      onClick={() => upgradeMutation.mutate(tier)}
                      disabled={upgradeMutation.isPending}
                    >
                      {currentTier === 'free' ? 'Start 14-Day Free Trial' : 'Switch Plan'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {[
                { feature: 'AI Predictive Insights', free: false, pro: true, family: true, icon: Sparkles },
                { feature: 'Analytics History', free: '30 days', pro: 'Unlimited', family: 'Unlimited', icon: TrendingUp },
                { feature: 'Personalized Challenges', free: false, pro: true, family: true, icon: Zap },
                { feature: 'Health Report Export', free: false, pro: true, family: true, icon: Calendar },
                { feature: 'Family Profiles', free: '1', pro: '1', family: '5', icon: Users },
                { feature: 'Priority Support', free: false, pro: true, family: true, icon: Shield }
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="grid grid-cols-4 gap-4 py-2 border-b last:border-0">
                    <div className="col-span-2 flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{item.feature}</span>
                    </div>
                    <div className="text-center">
                      {typeof item.pro === 'boolean' ? (
                        item.pro ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : '—'
                      ) : item.pro}
                    </div>
                    <div className="text-center">
                      {typeof item.family === 'boolean' ? (
                        item.family ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : '—'
                      ) : item.family}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-1">Can I cancel anytime?</h4>
              <p className="text-muted-foreground">Yes, cancel anytime. You'll keep access until the end of your billing period.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">What happens after the trial?</h4>
              <p className="text-muted-foreground">After 14 days, you'll be charged monthly unless you cancel. We'll remind you 3 days before.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Can I switch plans?</h4>
              <p className="text-muted-foreground">Yes, upgrade or downgrade anytime. Changes take effect at the next billing cycle.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}