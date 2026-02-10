import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdherenceAnalytics from '../components/AdherenceAnalytics';
import GamificationDashboard from '../components/GamificationDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import RootPageHeader from '../components/RootPageHeader';

export default function Analytics() {
  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: () => base44.entities.Medication.filter({ active: true })
  });

  const { data: allLogs = [] } = useQuery({
    queryKey: ['logs'],
    queryFn: () => base44.entities.MedicationLog.list('-created_date', 100)
  });

  const { data: allCheckIns = [] } = useQuery({
    queryKey: ['checkins'],
    queryFn: () => base44.entities.CheckIn.list('-created_date', 30)
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

      {/* Adherence Analytics */}
      <div className="mb-20">
        <AdherenceAnalytics 
          medications={medications} 
          logs={allLogs} 
          checkIns={allCheckIns} 
        />
      </div>
    </div>
    </div>
  );
}