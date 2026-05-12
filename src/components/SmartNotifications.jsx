import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Zap, AlertCircle, Clock, Settings } from 'lucide-react';
import { format, addMinutes, differenceInMinutes } from 'date-fns';
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
import { LocalNotifications } from '@capacitor/local-notifications';

// Stable integer ID: medication id hash + day + time slot index + type
function stableId(medId, dayOffset, timeIndex, type) {
  let h = 0;
  const s = `${medId}-${dayOffset}-${timeIndex}-${type}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1_000_000_000) + 1;
}

async function scheduleAll(medications, preferences) {
  try {
    // Cancel all existing scheduled notifications before rescheduling
    const { notifications: pending } = await LocalNotifications.getPending();
    if (pending.length > 0) await LocalNotifications.cancel({ notifications: pending });

    const notifications = [];
    const now = new Date();

    for (let day = 0; day < 7; day++) {
      medications.forEach((med, mi) => {
        (med.times ?? []).forEach((time, ti) => {
          const [h, m] = time.split(':').map(Number);
          const fireAt = new Date();
          fireAt.setDate(fireAt.getDate() + day);
          fireAt.setHours(h, m, 0, 0);
          if (fireAt <= now) return;

          // Lead-time reminder
          const leadAt = new Date(fireAt.getTime() - preferences.reminderLeadTime * 60_000);
          if (leadAt > now) {
            notifications.push({
              id: stableId(med.id ?? mi, day, ti, 0),
              title: `${med.critical ? '⚠️ ' : ''}${med.name} in ${preferences.reminderLeadTime} min`,
              body: `Take ${med.dosage} at ${time}`,
              schedule: { at: leadAt },
              smallIcon: 'ic_stat_icon_config_sample',
              autoCancel: true,
            });
          }

          // At-time notification
          notifications.push({
            id: stableId(med.id ?? mi, day, ti, 1),
            title: `Time to take ${med.name}`,
            body: med.dosage,
            schedule: { at: fireAt },
            smallIcon: 'ic_stat_icon_config_sample',
            ongoing: !!(med.critical && preferences.persistentForCritical),
            autoCancel: true,
          });
        });
      });
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch {
    // Ignore — running in browser dev mode or permissions not granted yet
  }
}

const PREFS_KEY = 'axis_notif_prefs';

function loadPrefs() {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function savePrefs(prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { }
}

const DEFAULT_PREFS = {
  enableSound: true,
  enableVibration: true,
  reminderLeadTime: 15,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  enableQuietHours: false,
  persistentForCritical: true,
  escalatingReminders: true,
};

export default function SmartNotifications({ schedule, medications }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permission, setPermission] = useState('default');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState(() => ({ ...DEFAULT_PREFS, ...(loadPrefs() ?? {}) }));

  // Check current permission status on mount
  useEffect(() => {
    LocalNotifications.checkPermissions()
      .then(({ display }) => {
        setPermission(display);
        setNotificationsEnabled(display === 'granted');
      })
      .catch(() => {});

    // Create Android notification channel (required on Android 8+)
    LocalNotifications.createChannel({
      id: 'axis_meds',
      name: 'Medication Reminders',
      description: 'Axis medication reminder notifications',
      importance: 5, // IMPORTANCE_HIGH
      visibility: 1,
      vibration: true,
    }).catch(() => {});
  }, []);

  // Re-schedule whenever medications or preferences change (and permission is granted)
  useEffect(() => {
    if (!notificationsEnabled || !medications?.length) return;
    scheduleAll(medications, preferences);
  }, [medications, notificationsEnabled, preferences]);

  const requestPermission = async () => {
    try {
      const { display } = await LocalNotifications.requestPermissions();
      setPermission(display);
      setNotificationsEnabled(display === 'granted');
      if (display === 'granted') {
        toast.success('Notifications enabled');
        if (medications?.length) scheduleAll(medications, preferences);
      } else {
        toast.error('Notification permission denied');
      }
    } catch {
      toast.error('Could not request notification permission');
    }
  };

  const handleSavePrefs = () => {
    savePrefs(preferences);
    if (notificationsEnabled && medications?.length) scheduleAll(medications, preferences);
    toast.success('Notification preferences saved');
    setSettingsOpen(false);
  };

  const upcomingMeds = schedule?.filter(item => !item.log).slice(0, 3) ?? [];

  return (
    <Card className="shadow-md border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Notifications
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
                  <DialogDescription>Customize your medication reminders</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label>Reminder Lead Time</Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[preferences.reminderLeadTime]}
                        onValueChange={([v]) => setPreferences(p => ({ ...p, reminderLeadTime: v }))}
                        min={5} max={60} step={5} className="flex-1"
                      />
                      <span className="text-sm font-medium w-16">{preferences.reminderLeadTime} min</span>
                    </div>
                  </div>

                  {[
                    ['persistentForCritical', 'Persistent Critical Alerts', 'Keep alert visible until dismissed for critical meds'],
                    ['escalatingReminders', 'Escalating Reminders', 'Repeat reminders for missed doses'],
                  ].map(([key, label, desc]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <Label>{label}</Label>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                      <Switch
                        checked={preferences[key]}
                        onCheckedChange={checked => setPreferences(p => ({ ...p, [key]: checked }))}
                      />
                    </div>
                  ))}

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label>Quiet Hours</Label>
                      <Switch
                        checked={preferences.enableQuietHours}
                        onCheckedChange={checked => setPreferences(p => ({ ...p, enableQuietHours: checked }))}
                      />
                    </div>
                    {preferences.enableQuietHours && (
                      <div className="grid grid-cols-2 gap-3 pl-4">
                        {[['quietHoursStart', 'Start'], ['quietHoursEnd', 'End']].map(([k, lbl]) => (
                          <div key={k}>
                            <Label className="text-xs">{lbl}</Label>
                            <Input
                              type="time"
                              value={preferences[k]}
                              onChange={e => setPreferences(p => ({ ...p, [k]: e.target.value }))}
                              className="mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Button onClick={handleSavePrefs} className="w-full">Save Preferences</Button>
              </DialogContent>
            </Dialog>

            <Button
              variant={notificationsEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={requestPermission}
              disabled={permission === 'denied'}
            >
              {notificationsEnabled
                ? <><Bell className="w-4 h-4 mr-2" />Enabled</>
                : <><BellOff className="w-4 h-4 mr-2" />Enable</>}
            </Button>
          </div>
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {notificationsEnabled
            ? 'Reminders scheduled for the next 7 days'
            : 'Enable to receive medication reminders'}
        </p>
      </CardHeader>

      <CardContent>
        {permission === 'denied' ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-gray-700">
              Notifications blocked. Go to Android Settings → Apps → Axis → Notifications to re-enable.
            </p>
          </div>
        ) : !notificationsEnabled ? (
          <div className="text-center py-4">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600">
              Tap Enable above to schedule reminders for all your medications
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-green-500" />
              <span className="text-green-700 dark:text-green-400 font-medium">Active</span>
              <Badge variant="outline" className="text-xs">
                {medications?.length ?? 0} medication{medications?.length !== 1 ? 's' : ''} scheduled
              </Badge>
            </div>

            {upcomingMeds.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Today's upcoming:</p>
                <div className="space-y-2">
                  {upcomingMeds.map((item, idx) => {
                    const [h, m] = item.scheduledTime.split(':').map(Number);
                    const scheduledDate = new Date();
                    scheduledDate.setHours(h, m, 0, 0);
                    const minutesUntil = differenceInMinutes(scheduledDate, new Date());
                    const reminderTime = format(addMinutes(scheduledDate, -preferences.reminderLeadTime), 'HH:mm');

                    return (
                      <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-xs">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.medication.name}</p>
                              {item.medication.critical && (
                                <Badge className="bg-red-100 text-red-800 text-[10px] px-1 py-0">Critical</Badge>
                              )}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400">
                              Due: {item.scheduledTime}
                              {minutesUntil > 0 && ` (in ${minutesUntil} min)`}
                            </p>
                            <div className="flex items-center gap-1 mt-1 text-blue-700 dark:text-blue-300">
                              <Clock className="w-3 h-3" />
                              <span>Reminder at {reminderTime}</span>
                            </div>
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
