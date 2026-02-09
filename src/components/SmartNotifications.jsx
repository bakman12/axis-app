import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Zap, AlertCircle, Clock } from 'lucide-react';
import { format, addMinutes, differenceInMinutes } from 'date-fns';
import { toast } from 'sonner';

export default function SmartNotifications({ schedule, checkIn }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      setNotificationsEnabled(result === 'granted');
      if (result === 'granted') {
        toast.success('Smart notifications enabled');
      }
    }
  };

  const sendNotification = (title, body, options = {}) => {
    if (notificationsEnabled && 'Notification' in window) {
      new Notification(title, {
        body,
        icon: '💊',
        badge: '💊',
        ...options
      });
    }
  };

  // Smart notification logic
  useEffect(() => {
    if (!notificationsEnabled || !schedule || schedule.length === 0) return;

    const checkUpcoming = () => {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');

      schedule.forEach(item => {
        if (item.log) return; // Already logged

        const [hours, minutes] = item.scheduledTime.split(':');
        const scheduledDate = new Date();
        scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const minutesUntil = differenceInMinutes(scheduledDate, now);

        // Enhanced reminders based on context
        const isHighRisk = checkIn?.routine_disrupted || checkIn?.context !== 'normal';
        const reminderMinutes = item.medication.critical ? (isHighRisk ? 30 : 15) : 10;

        if (minutesUntil === reminderMinutes) {
          const urgency = item.medication.critical ? '⚠️ CRITICAL' : '';
          sendNotification(
            `${urgency} ${item.medication.name} Due Soon`,
            `Take ${item.medication.dosage} at ${item.scheduledTime}${
              isHighRisk ? ' - Extra reminder due to disrupted routine' : ''
            }`,
            { tag: `med-${item.medication.id}-${item.scheduledTime}` }
          );
        }

        // Extra reminder for critical meds if late
        if (item.medication.critical && minutesUntil < -10 && minutesUntil % 10 === 0) {
          sendNotification(
            '🚨 CRITICAL Medication Overdue',
            `${item.medication.name} was due at ${item.scheduledTime}. Please take it now.`,
            { tag: `late-${item.medication.id}`, requireInteraction: true }
          );
        }
      });
    };

    const interval = setInterval(checkUpcoming, 60000); // Check every minute
    checkUpcoming(); // Check immediately

    return () => clearInterval(interval);
  }, [schedule, notificationsEnabled, checkIn]);

  const upcomingMeds = schedule
    ?.filter(item => !item.log)
    .slice(0, 3) || [];

  return (
    <Card className="shadow-md border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Smart Notifications
          </div>
          <Button
            variant={notificationsEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={requestPermission}
            disabled={permission === 'denied'}
          >
            {notificationsEnabled ? (
              <><Bell className="w-4 h-4 mr-2" /> Enabled</>
            ) : (
              <><BellOff className="w-4 h-4 mr-2" /> Enable</>
            )}
          </Button>
        </CardTitle>
        <p className="text-sm text-gray-600">
          {notificationsEnabled 
            ? 'Adaptive reminders based on your routine'
            : 'Enable to receive proactive medication reminders'
          }
        </p>
      </CardHeader>
      <CardContent>
        {permission === 'denied' ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-gray-700">
              Notifications blocked. Please enable in browser settings.
            </p>
          </div>
        ) : !notificationsEnabled ? (
          <div className="text-center py-4">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600">
              Get intelligent reminders that adapt to your schedule and routine disruptions
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-green-500" />
              <span className="text-green-700 font-medium">Active</span>
              {checkIn?.routine_disrupted && (
                <Badge className="bg-orange-100 text-orange-800 text-xs">
                  Extra reminders enabled
                </Badge>
              )}
            </div>
            
            {upcomingMeds.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 mb-2">Next reminders:</p>
                <div className="space-y-2">
                  {upcomingMeds.map((item, idx) => {
                    const [hours, minutes] = item.scheduledTime.split(':');
                    const scheduledDate = new Date();
                    scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    const minutesUntil = differenceInMinutes(scheduledDate, new Date());
                    const isHighRisk = checkIn?.routine_disrupted;
                    const reminderMinutes = item.medication.critical ? (isHighRisk ? 30 : 15) : 10;
                    const reminderTime = format(addMinutes(scheduledDate, -reminderMinutes), 'HH:mm');
                    
                    return (
                      <div key={idx} className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{item.medication.name}</p>
                            <p className="text-gray-600">Due: {item.scheduledTime}</p>
                          </div>
                          <div className="text-right">
                            <Clock className="w-3 h-3 inline text-blue-500 mr-1" />
                            <span className="text-blue-700">Reminder at {reminderTime}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}