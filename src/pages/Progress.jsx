import { useQuery } from '@tanstack/react-query';
import { entities } from '@/lib/encryptedBase44Client';
import GamificationDashboard from '../components/GamificationDashboard';
import SymptomLog from '../components/SymptomLog';
import RootPageHeader from '../components/RootPageHeader';
import PullToRefresh from '../components/PullToRefresh';
import { useQueryClient } from '@tanstack/react-query';

export default function Progress() {
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries(['achievements']);
    await queryClient.invalidateQueries(['challenge']);
    await queryClient.invalidateQueries(['logs']);
  };

  const { data: allLogs = [] } = useQuery({
    queryKey: ['logs'],
    queryFn: () => entities.MedicationLog.list('-created_date', 100)
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: () => entities.Medication.filter({ active: true })
  });

  return (
    <div style={{ overscrollBehavior: 'none' }}>
      <RootPageHeader 
        title="Your Progress" 
        subtitle="Track achievements, challenges, and compete on the leaderboard" 
      />
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 pb-24 space-y-5" style={{ overscrollBehavior: 'none' }}>
          <GamificationDashboard logs={allLogs} medications={medications} />
          <SymptomLog medications={medications} />
        </div>
      </PullToRefresh>
    </div>
  );
}