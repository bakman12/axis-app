import { useQuery, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/lib/encryptedBase44Client';
import GamificationDashboard from '../components/GamificationDashboard';
import SymptomLog from '../components/SymptomLog';
import RootPageHeader from '../components/RootPageHeader';
import PullToRefresh from '../components/PullToRefresh';

const sans = { fontFamily: 'Inter, sans-serif' };

export default function Progress() {
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries(['achievements']);
    await queryClient.invalidateQueries(['challenge']);
    await queryClient.invalidateQueries(['logs']);
  };

  const { data: allLogs = [] } = useQuery({
    queryKey: ['logs'],
    queryFn: () => entities.MedicationLog.list('-created_date', 100),
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: () => entities.Medication.filter({ active: true }),
  });

  return (
    <div style={{ overscrollBehavior: 'none', background: 'hsl(var(--background))', minHeight: '100vh' }}>
      <RootPageHeader title="Progress" subtitle="Streaks, achievements & insights" />

      <PullToRefresh onRefresh={handleRefresh}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 96px', overscrollBehavior: 'none', display: 'flex', flexDirection: 'column', gap: 24 }}>

          <div>
            <p style={{ ...sans, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: 14 }}>
              Achievements
            </p>
            <GamificationDashboard logs={allLogs} medications={medications} />
          </div>

          <div>
            <p style={{ ...sans, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: 14 }}>
              Symptom Log
            </p>
            <SymptomLog medications={medications} />
          </div>

        </div>
      </PullToRefresh>
    </div>
  );
}
