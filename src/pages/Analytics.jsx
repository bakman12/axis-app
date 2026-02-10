import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdherenceAnalytics from '../components/AdherenceAnalytics';
import GamificationDashboard from '../components/GamificationDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

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
    <div className="p-4 md:p-8 max-w-6xl mx-auto" style={{ overscrollBehavior: 'none' }}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <TrendingUp className="w-8 h-8" />
          Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track your progress and achievements
        </p>
      </div>

      {/* Gamification Dashboard */}
      <div className="mb-6">
        <GamificationDashboard logs={allLogs} medications={medications} />
      </div>

      {/* Adherence Analytics */}
      <div>
        <AdherenceAnalytics 
          medications={medications} 
          logs={allLogs} 
          checkIns={allCheckIns} 
        />
      </div>
    </div>
  );
}