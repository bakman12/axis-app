import React from 'react';
import { entities } from '@/lib/encryptedBase44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMissedDoseChecker } from '@/lib/useMissedDoseChecker';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import TodaySchedule from '../components/TodaySchedule';
import PullToRefresh from '../components/PullToRefresh';
import SmartRefillTracker from '../components/SmartRefillTracker';
import RootPageHeader from '../components/RootPageHeader';
import DoseHistoryCalendar from '../components/DoseHistoryCalendar';

export default function Home() {
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries(['medications']);
    await queryClient.invalidateQueries(['logs']);
  };

  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: () => entities.Medication.filter({ active: true })
  });

  const { data: todayLogs = [] } = useQuery({
    queryKey: ['logs', 'today'],
    queryFn: async () => {
      const start = startOfDay(new Date()).toISOString();
      const end   = endOfDay(new Date()).toISOString();
      const logs  = await entities.MedicationLog.list();
      return logs.filter(log => {
        const t = new Date(log.taken_time || log.created_date);
        return t >= new Date(start) && t <= new Date(end);
      });
    }
  });

  // Build today's schedule sorted by scheduled time
  const todaySchedule = medications.flatMap(med =>
    (med.times || []).map(time => ({
      medication: med,
      scheduledTime: time,
      log: todayLogs.find(log =>
        log.medication_id === med.id && log.scheduled_time === time
      )
    }))
  ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const takenCount   = todaySchedule.filter(item => item.log?.status === 'taken').length;
  const pendingCount = todaySchedule.filter(item => !item.log).length;
  const totalCount   = todaySchedule.length;

  // Auto-mark overdue unlogged doses as missed (runs on mount + app resume)
  useMissedDoseChecker(medications, todayLogs, queryClient);

  return (
    <div style={{ overscrollBehavior: 'none' }}>
      <RootPageHeader
        title="Axis"
        subtitle={format(new Date(), 'EEEE, d MMMM')}
      />
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-2xl mx-auto p-4 pb-24 space-y-5" style={{ overscrollBehavior: 'none' }}>

          {/* Today's progress summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-white/80 dark:bg-gray-900/50 backdrop-blur border-gray-200/50 dark:border-gray-800/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Taken</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{takenCount}</p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-900/50 backdrop-blur border-gray-200/50 dark:border-gray-800/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pending</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pendingCount}</p>
                  </div>
                  <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-900/50 backdrop-blur border-gray-200/50 dark:border-gray-800/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's medication schedule */}
          <TodaySchedule schedule={todaySchedule} />

          {/* 30-day adherence heatmap */}
          <DoseHistoryCalendar />

          {/* Refill warnings */}
          <SmartRefillTracker />

        </div>
      </PullToRefresh>
    </div>
  );
}
