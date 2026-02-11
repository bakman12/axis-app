import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Zap, AlertCircle, Clock, MapPin, Settings } from 'lucide-react';
import { format, addMinutes, differenceInMinutes, isAfter, isBefore } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

export default function SmartNotifications({ schedule, checkIn }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permission, setPermission] = useState('default');
  const [snoozedMeds, setSnoozedMeds] = useState(new Map());
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Notification preferences from user settings
  const [preferences, setPreferences] = useState({
    enableSound: true,
    enableVibration: true,
    reminderLeadTime: 15, // minutes before
    enableLocationReminders: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    enableQuietHours: false,
    persistentForCritical: true,
    escalatingReminders: true
  });

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === 'granted');
    }
    
    // Load preferences from user settings
    base44.auth.me().then(user => {
      if (user?.notification_preferences) {
        setPreferences(prev => ({ ...prev, ...user.notification_preferences }));
      }
    }).catch(() => {});
  }, []);

  // Location tracking
  useEffect(() => {
    if (!preferences.enableLocationReminders) return;

    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationEnabled(true);
        },
        (error) => {
          console.log('Location error:', error);
          setLocationEnabled(false);
        },
        { enableHighAccuracy: false, maximumAge: 300000 } // 5 min cache
      );

      return () => navigator.geolocation.clearPosition(watchId);
    }
  }, [preferences.enableLocationReminders]);

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

  const isQuietHours = () => {
    if (!preferences.enableQuietHours) return false;
    
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    const start = preferences.quietHoursStart;
    const end = preferences.quietHoursEnd;
    
    if (start < end) {
      return currentTime >= start && currentTime <= end;
    } else {
      return currentTime >= start || currentTime <= end;
    }
  };

  const snooze = (medicationId, scheduledTime, minutes = 10) => {
    const snoozedUntil = addMinutes(new Date(), minutes);
    setSnoozedMeds(prev => new Map(prev).set(`${medicationId}-${scheduledTime}`, snoozedUntil));
    toast.success(`Snoozed for ${minutes} minutes`);
  };

  const sendNotification = (title, body, options = {}) => {
    if (!notificationsEnabled || !('Notification' in window)) return;
    
    // Check quiet hours (unless critical and persistent enabled)
    if (isQuietHours() && !(options.critical && preferences.persistentForCritical)) {
      console.log('Skipping notification - quiet hours');
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: '💊',
      badge: '💊',
      silent: !preferences.enableSound,
      vibrate: preferences.enableVibration ? [200, 100, 200] : undefined,
      ...options
    });

    // Add action buttons if supported
    if (options.actions) {
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    return notification;
  };

  // Enhanced smart notification logic
  useEffect(() => {
    if (!notificationsEnabled || !schedule || schedule.length === 0) return;

    const checkUpcoming = () => {
      const now = new Date();

      schedule.forEach(item => {
        if (item.log) return; // Already logged

        const medKey = `${item.medication.id}-${item.scheduledTime}`;
        
        // Check if snoozed
        const snoozedUntil = snoozedMeds.get(medKey);
        if (snoozedUntil && isBefore(now, snoozedUntil)) {
          return; // Still snoozed
        } else if (snoozedUntil) {
          // Snooze expired, remove it
          setSnoozedMeds(prev => {
            const newMap = new Map(prev);
            newMap.delete(medKey);
            return newMap;
          });
        }

        const [hours, minutes] = item.scheduledTime.split(':');
        const scheduledDate = new Date();
        scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const minutesUntil = differenceInMinutes(scheduledDate, now);

        // Enhanced reminders based on context and preferences
        const isHighRisk = checkIn?.routine_disrupted || checkIn?.context !== 'normal';
        const baseLeadTime = preferences.reminderLeadTime;
        const reminderMinutes = item.medication.critical ? (isHighRisk ? baseLeadTime + 15 : baseLeadTime) : baseLeadTime;

        // Initial reminder
        if (minutesUntil === reminderMinutes) {
          const urgency = item.medication.critical ? '⚠️ CRITICAL' : '';
          const locationNote = locationEnabled && checkIn?.location_changed ? 
            '\n📍 You\'re in a different location - don\'t forget!' : '';
          
          sendNotification(
            `${urgency} ${item.medication.name} Due Soon`,
            `Take ${item.medication.dosage} at ${item.scheduledTime}${
              isHighRisk ? '\n⚠️ Extra reminder - routine disrupted' : ''
            }${locationNote}`,
            { 
              tag: medKey,
              requireInteraction: item.medication.critical,
              critical: item.medication.critical
            }
          );
        }

        // Escalating reminders for missed medications
        if (preferences.escalatingReminders && minutesUntil < 0) {
          const minutesLate = Math.abs(minutesUntil);
          
          // Critical meds: every 10 minutes when late
          if (item.medication.critical && minutesLate > 0 && minutesLate % 10 === 0) {
            sendNotification(
              '🚨 CRITICAL Medication Overdue',
              `${item.medication.name} was due at ${item.scheduledTime}. Please take it now.`,
              { 
                tag: `late-${medKey}`,
                requireInteraction: true,
                critical: true
              }
            );
          }
          
          // Regular meds: reminder at 15, 30, 60 minutes late
          if (!item.medication.critical && [15, 30, 60].includes(minutesLate)) {
            sendNotification(
              `${item.medication.name} Overdue`,
              `Scheduled for ${item.scheduledTime}. Take when possible.`,
              { tag: `late-${medKey}` }
            );
          }
        }

        // At scheduled time
        if (minutesUntil === 0) {
          sendNotification(
            `Time to take ${item.medication.name}`,
            `${item.medication.dosage} - Take now`,
            { 
              tag: `now-${medKey}`,
              requireInteraction: item.medication.critical
            }
          );
        }
      });
    };

    const interval = setInterval(checkUpcoming, 60000); // Check every minute
    checkUpcoming(); // Check immediately

    return () => clearInterval(interval);
  }, [schedule, notificationsEnabled, checkIn, preferences, snoozedMeds, locationEnabled]);

  const upcomingMeds = schedule
    ?.filter(item => !item.log)
    .slice(0, 3) || [];

  const savePreferences = async () => {
    try {
      await base44.auth.updateMe({ notification_preferences: preferences });
      toast.success('Notification preferences saved');
      setSettingsOpen(false);
    } catch (error) {
      toast.error('Failed to save preferences');
    }
  };

  return (
    <Card className="shadow-md border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Smart Notifications
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Notification Settings</DialogTitle>
                  <DialogDescription>
                    Customize your medication reminders
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label>Reminder Lead Time</Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[preferences.reminderLeadTime]}
                        onValueChange={([value]) => setPreferences(p => ({ ...p, reminderLeadTime: value }))}
                        min={5}
                        max={60}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-16">{preferences.reminderLeadTime} min</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Sound</Label>
                      <p className="text-xs text-gray-500">Play sound with notifications</p>
                    </div>
                    <Switch
                      checked={preferences.enableSound}
                      onCheckedChange={(checked) => setPreferences(p => ({ ...p, enableSound: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Vibration</Label>
                      <p className="text-xs text-gray-500">Vibrate on notifications</p>
                    </div>
                    <Switch
                      checked={preferences.enableVibration}
                      onCheckedChange={(checked) => setPreferences(p => ({ ...p, enableVibration: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Location Reminders</Label>
                      <p className="text-xs text-gray-500">Extra reminders when location changes</p>
                    </div>
                    <Switch
                      checked={preferences.enableLocationReminders}
                      onCheckedChange={(checked) => setPreferences(p => ({ ...p, enableLocationReminders: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Escalating Reminders</Label>
                      <p className="text-xs text-gray-500">Repeat reminders for missed doses</p>
                    </div>
                    <Switch
                      checked={preferences.escalatingReminders}
                      onCheckedChange={(checked) => setPreferences(p => ({ ...p, escalatingReminders: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Persistent Critical Alerts</Label>
                      <p className="text-xs text-gray-500">Always alert for critical meds</p>
                    </div>
                    <Switch
                      checked={preferences.persistentForCritical}
                      onCheckedChange={(checked) => setPreferences(p => ({ ...p, persistentForCritical: checked }))}
                    />
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label>Quiet Hours</Label>
                      <Switch
                        checked={preferences.enableQuietHours}
                        onCheckedChange={(checked) => setPreferences(p => ({ ...p, enableQuietHours: checked }))}
                      />
                    </div>
                    
                    {preferences.enableQuietHours && (
                      <div className="grid grid-cols-2 gap-3 pl-4">
                        <div>
                          <Label className="text-xs">Start</Label>
                          <Input
                            type="time"
                            value={preferences.quietHoursStart}
                            onChange={(e) => setPreferences(p => ({ ...p, quietHoursStart: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">End</Label>
                          <Input
                            type="time"
                            value={preferences.quietHoursEnd}
                            onChange={(e) => setPreferences(p => ({ ...p, quietHoursEnd: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Button onClick={savePreferences} className="w-full">
                  Save Preferences
                </Button>
              </DialogContent>
            </Dialog>

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
          </div>
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
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
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-green-500" />
              <span className="text-green-700 dark:text-green-400 font-medium">Active</span>
              {checkIn?.routine_disrupted && (
                <Badge className="bg-orange-100 text-orange-800 text-xs">
                  Extra reminders enabled
                </Badge>
              )}
              {locationEnabled && (
                <Badge variant="outline" className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  Location tracking
                </Badge>
              )}
              {preferences.enableQuietHours && (
                <Badge variant="outline" className="text-xs">
                  🌙 Quiet hours: {preferences.quietHoursStart}-{preferences.quietHoursEnd}
                </Badge>
              )}
            </div>
            
            {upcomingMeds.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Next reminders:</p>
                <div className="space-y-2">
                  {upcomingMeds.map((item, idx) => {
                    const [hours, minutes] = item.scheduledTime.split(':');
                    const scheduledDate = new Date();
                    scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    const minutesUntil = differenceInMinutes(scheduledDate, new Date());
                    const isHighRisk = checkIn?.routine_disrupted;
                    const baseLeadTime = preferences.reminderLeadTime;
                    const reminderMinutes = item.medication.critical ? (isHighRisk ? baseLeadTime + 15 : baseLeadTime) : baseLeadTime;
                    const reminderTime = format(addMinutes(scheduledDate, -reminderMinutes), 'HH:mm');
                    const medKey = `${item.medication.id}-${item.scheduledTime}`;
                    const isSnoozed = snoozedMeds.has(medKey);
                    
                    return (
                      <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {item.medication.name}
                              </p>
                              {item.medication.critical && (
                                <Badge className="bg-red-100 text-red-800 text-[10px] px-1 py-0">
                                  Critical
                                </Badge>
                              )}
                              {isSnoozed && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  Snoozed
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400">Due: {item.scheduledTime}</p>
                            <div className="flex items-center gap-1 mt-1 text-blue-700 dark:text-blue-300">
                              <Clock className="w-3 h-3" />
                              <span>Reminder at {reminderTime}</span>
                            </div>
                          </div>
                          {minutesUntil >= 0 && minutesUntil <= reminderMinutes && !isSnoozed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => snooze(item.medication.id, item.scheduledTime, 10)}
                            >
                              Snooze 10m
                            </Button>
                          )}
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