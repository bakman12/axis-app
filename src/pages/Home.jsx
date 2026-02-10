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

export default function Home() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Medication Tracker
          </h1>
          <p className="text-gray-600">
            Stay on track with your medication schedule
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white shadow-sm border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Taken Today</p>
                  <p className="text-3xl font-bold text-gray-900">{takenCount}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
                </div>
                <Clock className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Missed</p>
                  <p className="text-3xl font-bold text-gray-900">{missedCount}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Day Streak</p>
                  <p className="text-3xl font-bold text-gray-900">{calculateStreak()}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-500" />
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
        <Card className="mt-8 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Medications</CardTitle>
            <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Medication
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
    </div>
  );
}