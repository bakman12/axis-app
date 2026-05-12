import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { entities } from '@/lib/encryptedBase44Client';
import AdherenceAnalytics from '../components/AdherenceAnalytics';
import GamificationDashboard from '../components/GamificationDashboard';
import RootPageHeader from '../components/RootPageHeader';
import PremiumGate from '../components/PremiumGate';
import AdvancedInsights from '../components/AdvancedInsights';
import HealthReportGenerator from '../components/HealthReportGenerator';

export default function Analytics() {
  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: () => entities.Medication.filter({ active: true })
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const isPremium = user?.subscription_tier === 'pro' || user?.subscription_tier === 'family' ||
                   (user?.trial_ends_at && new Date(user.trial_ends_at) > new Date());

  const logLimit = isPremium ? 1000 : 30;

  const { data: allLogs = [] } = useQuery({
    queryKey: ['logs', logLimit],
    queryFn: () => entities.MedicationLog.list('-created_date', logLimit)
  });

  const { data: allCheckIns = [] } = useQuery({
    queryKey: ['checkins'],
    queryFn: () => entities.CheckIn.list('-created_date', 30)
  });

  return (
    <div style={{ overscrollBehavior: 'none' }}>
      <RootPageHeader 
        title="Analytics" 
        subtitle="Track your progress and achievements" 
      />
      <div className="p-4 md:p-8 max-w-6xl mx-auto" style={{ overscrollBehavior: 'none' }}>

      {/* Gamification Dashboard */}
      <div className="mb-6">
        <GamificationDashboard logs={allLogs} medications={medications} />
      </div>

      {/* Health Report Generator */}
      <div className="mb-6">
        <HealthReportGenerator />
      </div>

      {/* Advanced Insights - Premium Only */}
      {isPremium && allLogs.length > 0 && (
        <div className="mb-6">
          <AdvancedInsights logs={allLogs} medications={medications} />
        </div>
      )}

      {/* Adherence Analytics */}
      <div className="mb-20">
        {isPremium ? (
          <AdherenceAnalytics 
            medications={medications} 
            logs={allLogs} 
            checkIns={allCheckIns} 
          />
        ) : (
          <PremiumGate feature="Extended Analytics & Insights" requiredTier="pro">
            <AdherenceAnalytics 
              medications={medications} 
              logs={allLogs.slice(0, 30)} 
              checkIns={allCheckIns} 
            />
          </PremiumGate>
        )}
      </div>
    </div>
    </div>
  );
}