import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import GamificationDashboard from '../components/GamificationDashboard';
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
    queryFn: () => base44.entities.MedicationLog.list('-created_date', 100)
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: () => base44.entities.Medication.filter({ active: true })
  });

  return (
    <div style={{ overscrollBehavior: 'none' }}>
      <RootPageHeader 
        title="Your Progress" 
        subtitle="Track achievements, challenges, and compete on the leaderboard" 
      />
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-6xl mx-auto p-4 md:p-8 pb-24" style={{ overscrollBehavior: 'none' }}>
          <GamificationDashboard logs={allLogs} medications={medications} />
        </div>
      </PullToRefresh>
    </div>
  );
}