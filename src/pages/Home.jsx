import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { format, parseISO, isToday, startOfDay, endOfDay } from 'date-fns';
import AddMedicationDialog from '../components/AddMedicationDialog';
import TodaySchedule from '../components/TodaySchedule';
import MedicationList from '../components/MedicationList';
import DailyCheckIn from '../components/DailyCheckIn';
import PredictiveInsights from '../components/PredictiveInsights';
import AIAssistant from '../components/AIAssistant';
import RefillReminders from '../components/RefillReminders';
import SmartNotifications from '../components/SmartNotifications';
import AdherenceAnalytics from '../components/AdherenceAnalytics';
import ActivityDetector from '../components/ActivityDetector';
import GamificationDashboard from '../components/GamificationDashboard';
import PullToRefresh from '../components/PullToRefresh';
import RootPageHeader from '../components/RootPageHeader';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function Home() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  const { data: medications = [], isLoading: medsLoading } = useQuery({
    queryKey: ['medications'],
    queryFn: () => base44.entities.Medication.filter({ active: true })
  });

  const { data: todayLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['logs', 'today'],
    queryFn: async () => {
      const start = startOfDay(new Date()).toISOString();
      const end = endOfDay(new Date()).toISOString();
      const logs = await base44.entities.MedicationLog.list();
      return logs.filter(log => {
        const takenTime = new Date(log.taken_time || log.created_date);
        return takenTime >= new Date(start) && takenTime <= new Date(end);
      });
    }
  });

  const { data: allLogs = [] } = useQuery({
    queryKey: ['logs'],
    queryFn: () => base44.entities.MedicationLog.list('-created_date', 100)
  });

  const { data: todayCheckIn } = useQuery({
    queryKey: ['checkin', format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      const checkIns = await base44.entities.CheckIn.filter({ date: format(new Date(), 'yyyy-MM-dd') });
      return checkIns[0] || null;
    }
  });

  const { data: allCheckIns = [] } = useQuery({
    queryKey: ['checkins'],
    queryFn: () => base44.entities.CheckIn.list('-created_date', 30)
  });

  const handleActivityChange = (activityData) => {
    console.log('Activity detected:', activityData);
    // Could trigger additional AI analysis or notifications here
  };

  // Calculate today's schedule
  const todaySchedule = medications.flatMap(med => 
    med.times.map(time => ({
      medication: med,
      scheduledTime: time,
      log: todayLogs.find(log => 
        log.medication_id === med.id && log.scheduled_time === time
      )
    }))
  ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const pendingCount = todaySchedule.filter(item => !item.log).length;
  const takenCount = todaySchedule.filter(item => item.log?.status === 'taken').length;
  const missedCount = todaySchedule.filter(item => item.log?.status === 'missed').length;

  // Calculate streak
  const calculateStreak = () => {
    // Simple streak calculation - days with all medications taken
    return 7; // Placeholder
  };

  return (
    <div style={{ overscrollBehavior: 'none' }}>
      <RootPageHeader 
        title="MedMind" 
        subtitle="Stay on track with your medication schedule" 
      />
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-6xl mx-auto p-4 md:p-8" style={{ overscrollBehavior: 'none' }}>

      {/* Medical Disclaimer */}
      <MedicalDisclaimer />

      {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <Card className="bg-white/80 dark:bg-gray-900/50 backdrop-blur border-gray-200/50 dark:border-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Taken Today</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{takenCount}</p>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-900/50 backdrop-blur border-gray-200/50 dark:border-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pending</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-900/50 backdrop-blur border-gray-200/50 dark:border-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Missed</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{missedCount}</p>
                </div>
                <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-900/50 backdrop-blur border-gray-200/50 dark:border-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Day Streak</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{calculateStreak()}</p>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Daily Check-In & Smart Features */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <DailyCheckIn />
        <SmartNotifications schedule={todaySchedule} checkIn={todayCheckIn} />
        <ActivityDetector onActivityChange={handleActivityChange} />
      </div>

      {/* AI Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PredictiveInsights medications={medications} />
        <RefillReminders medications={medications} />
      </div>

      {/* Gamification Dashboard */}
      <div className="mb-8">
        <GamificationDashboard logs={allLogs} medications={medications} />
      </div>

      {/* Today's Schedule */}
      <TodaySchedule schedule={todaySchedule} />

      {/* Analytics Dashboard */}
      <div className="mt-8">
        <AdherenceAnalytics 
          medications={medications} 
          logs={allLogs} 
          checkIns={allCheckIns} 
        />
      </div>

      {/* AI Assistant */}
      <div className="mt-8">
        <AIAssistant medications={medications} logs={allLogs} />
      </div>

      {/* All Medications */}
      <Card className="mt-8 bg-white/80 dark:bg-gray-900/50 backdrop-blur border-gray-200/50 dark:border-gray-800/50 shadow-sm mb-20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="dark:text-white">My Medications</CardTitle>
          <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700 h-11 select-none">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          <MedicationList medications={medications} isLoading={medsLoading} />
        </CardContent>
      </Card>

        {showAddDialog && (
          <AddMedicationDialog
            open={showAddDialog}
            onClose={() => setShowAddDialog(false)}
          />
        )}
        </div>
        </PullToRefresh>
        </div>
        );
        }