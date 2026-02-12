import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import TodaySchedule from '../components/TodaySchedule';
import DailyCheckIn from '../components/DailyCheckIn';
import PredictiveInsights from '../components/PredictiveInsights';
import AIAssistant from '../components/AIAssistant';
import SmartNotifications from '../components/SmartNotifications';
import ActivityDetector from '../components/ActivityDetector';
import PullToRefresh from '../components/PullToRefresh';
import SmartRefillTracker from '../components/SmartRefillTracker';
import RootPageHeader from '../components/RootPageHeader';
import MedicalDisclaimer from '../components/MedicalDisclaimer';
import DailyMoodCheckIn from '../components/DailyMoodCheckIn';

export default function Home() {
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries(['medications']);
    await queryClient.invalidateQueries(['logs']);
    await queryClient.invalidateQueries(['checkin']);
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

  const { data: todayCheckIn } = useQuery({
    queryKey: ['checkin', format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      const checkIns = await base44.entities.CheckIn.filter({ date: format(new Date(), 'yyyy-MM-dd') });
      return checkIns[0] || null;
    }
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
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
  const totalCount = todaySchedule.length;

  return (
    <div style={{ overscrollBehavior: 'none' }}>
      <RootPageHeader 
        title="MedMind" 
        subtitle="Stay on track with your medication schedule" 
      />
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 pb-24" style={{ overscrollBehavior: 'none' }}>

      {/* Medical Disclaimer */}
      <MedicalDisclaimer />

      {/* Today's Progress */}
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
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

      {/* Daily Check-In & Smart Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <DailyCheckIn />
        <SmartNotifications schedule={todaySchedule} checkIn={todayCheckIn} />
        <DailyMoodCheckIn />
      </div>

      {/* Smart Refill Tracker */}
      <SmartRefillTracker />

      {/* Today's Schedule */}
      <TodaySchedule schedule={todaySchedule} />

      {/* AI Features */}
      {(user?.ai_insights || user?.ai_assistant) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-6">
          {user?.ai_insights && <PredictiveInsights medications={medications} />}
          {user?.ai_assistant && <AIAssistant medications={medications} logs={todayLogs} />}
        </div>
      )}
        </div>
        </PullToRefresh>
        </div>
        );
        }