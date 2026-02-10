import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Bell, Shield, Target, Download, User, Save, CheckCircle, Trash2 } from 'lucide-react';
import HealthDataExport from '@/components/HealthDataExport';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import RootPageHeader from '../components/RootPageHeader';
import { PrivacyNotice } from '../components/MedicalDisclaimer';

export default function Settings() {
  const [formData, setFormData] = useState({
    notification_enabled: true,
    notification_timing: 15,
    notification_sound: true,
    reminder_sound_type: 'default',
    critical_only_notifications: false,
    snooze_enabled: true,
    snooze_duration: 10,
    priority_notifications: true,
    ai_data_sharing: true,
    ai_personalization: true,
    target_streak: 30,
    target_adherence: 95,
    time_format: '12h',
    theme: 'light',
    disable_system_gestures: false
  });
  const [saved, setSaved] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  useEffect(() => {
    if (user) {
      setFormData({
        notification_enabled: user.notification_enabled ?? true,
        notification_timing: user.notification_timing ?? 15,
        notification_sound: user.notification_sound ?? true,
        reminder_sound_type: user.reminder_sound_type ?? 'default',
        critical_only_notifications: user.critical_only_notifications ?? false,
        snooze_enabled: user.snooze_enabled ?? true,
        snooze_duration: user.snooze_duration ?? 10,
        priority_notifications: user.priority_notifications ?? true,
        ai_data_sharing: user.ai_data_sharing ?? true,
        ai_personalization: user.ai_personalization ?? true,
        target_streak: user.target_streak ?? 30,
        target_adherence: user.target_adherence ?? 95,
        time_format: user.time_format ?? '12h',
        theme: user.theme ?? 'light',
        disable_system_gestures: user.disable_system_gestures ?? false
      });
    }
  }, [user]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onMutate: () => {
      setSaved(true);
    },
    onSuccess: () => {
      toast.success('Settings saved successfully');
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => {
      setSaved(false);
      toast.error('Failed to save settings');
    }
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  const handleExportData = async () => {
    try {
      const [medications, logs, checkIns, achievements] = await Promise.all([
        base44.entities.Medication.list(),
        base44.entities.MedicationLog.list('-created_date', 1000),
        base44.entities.CheckIn.list('-created_date', 1000),
        base44.entities.Achievement.list()
      ]);

      const exportData = {
        export_date: new Date().toISOString(),
        user: {
          email: user.email,
          full_name: user.full_name
        },
        medications,
        logs,
        checkIns,
        achievements
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medication-data-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // Delete all user data
      const [medications, logs, checkIns, achievements] = await Promise.all([
        base44.entities.Medication.list(),
        base44.entities.MedicationLog.list(),
        base44.entities.CheckIn.list(),
        base44.entities.Achievement.list()
      ]);

      await Promise.all([
        ...medications.map(m => base44.entities.Medication.delete(m.id)),
        ...logs.map(l => base44.entities.MedicationLog.delete(l.id)),
        ...checkIns.map(c => base44.entities.CheckIn.delete(c.id)),
        ...achievements.map(a => base44.entities.Achievement.delete(a.id))
      ]);

      toast.success('Account data deleted successfully');
      // Logout after short delay
      setTimeout(() => {
        base44.auth.logout();
      }, 1500);
    } catch (error) {
      toast.error('Failed to delete account data');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="h-96 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ overscrollBehavior: 'none' }}>
      <RootPageHeader title="Settings" subtitle="Customize your experience" />
      <div className="p-4 md:p-8 max-w-4xl mx-auto" style={{ overscrollBehavior: 'none' }}>

        {/* Privacy Notice */}
        <PrivacyNotice />

              <div className="space-y-6">
          {/* Notification Preferences */}
          <Card className="shadow-md dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Notification Preferences
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Control how and when you receive medication reminders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg min-h-[44px]">
                <div>
                  <Label className="dark:text-white text-sm">Enable Notifications</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive medication reminders</p>
                </div>
                <Switch
                  checked={formData.notification_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, notification_enabled: checked })}
                  className="select-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timing" className="dark:text-white text-sm">Notification Timing</Label>
                <MobileSelect
                  value={formData.notification_timing.toString()}
                  onValueChange={(value) => setFormData({ ...formData, notification_timing: parseInt(value) })}
                  disabled={!formData.notification_enabled}
                  placeholder="Select timing"
                  options={[
                    { value: '0', label: 'At scheduled time' },
                    { value: '5', label: '5 minutes before' },
                    { value: '10', label: '10 minutes before' },
                    { value: '15', label: '15 minutes before' },
                    { value: '30', label: '30 minutes before' },
                    { value: '60', label: '1 hour before' }
                  ]}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg min-h-[44px]">
                <div>
                  <Label className="dark:text-white text-sm">Notification Sound</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Play sound with notifications</p>
                </div>
                <Switch
                  checked={formData.notification_sound}
                  onCheckedChange={(checked) => setFormData({ ...formData, notification_sound: checked })}
                  disabled={!formData.notification_enabled}
                  className="select-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg min-h-[44px]">
                <div>
                  <Label className="dark:text-white text-sm">Critical Medications Only</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Only notify for critical time-sensitive meds</p>
                </div>
                <Switch
                  checked={formData.critical_only_notifications}
                  onCheckedChange={(checked) => setFormData({ ...formData, critical_only_notifications: checked })}
                  disabled={!formData.notification_enabled}
                  className="select-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder_sound" className="dark:text-white text-sm">Reminder Sound</Label>
                <MobileSelect
                  value={formData.reminder_sound_type}
                  onValueChange={(value) => setFormData({ ...formData, reminder_sound_type: value })}
                  disabled={!formData.notification_enabled || !formData.notification_sound}
                  placeholder="Select sound"
                  options={[
                    { value: 'default', label: 'Default' },
                    { value: 'gentle', label: 'Gentle (Soft tone)' },
                    { value: 'chime', label: 'Chime (Pleasant bell)' },
                    { value: 'bell', label: 'Bell (Clear alert)' },
                    { value: 'alert', label: 'Alert (Urgent tone)' }
                  ]}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg min-h-[44px]">
                <div>
                  <Label className="dark:text-white text-sm">Dynamic Priority</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Higher priority for critical medications</p>
                </div>
                <Switch
                  checked={formData.priority_notifications}
                  onCheckedChange={(checked) => setFormData({ ...formData, priority_notifications: checked })}
                  disabled={!formData.notification_enabled}
                  className="select-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg min-h-[44px]">
                <div>
                  <Label className="dark:text-white text-sm">Snooze Functionality</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enable snooze for pending reminders</p>
                </div>
                <Switch
                  checked={formData.snooze_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, snooze_enabled: checked })}
                  disabled={!formData.notification_enabled}
                  className="select-none"
                />
              </div>

              {formData.snooze_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="snooze_duration" className="dark:text-white text-sm">Snooze Duration</Label>
                  <MobileSelect
                    value={formData.snooze_duration.toString()}
                    onValueChange={(value) => setFormData({ ...formData, snooze_duration: parseInt(value) })}
                    disabled={!formData.notification_enabled}
                    placeholder="Select duration"
                    options={[
                      { value: '5', label: '5 minutes' },
                      { value: '10', label: '10 minutes' },
                      { value: '15', label: '15 minutes' },
                      { value: '20', label: '20 minutes' },
                      { value: '30', label: '30 minutes' }
                    ]}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Privacy & AI Settings */}
          <Card className="shadow-md border-l-4 border-l-purple-500 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Privacy & AI Features
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Control how AI analyzes your data and provides insights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 min-h-[44px]">
                <div>
                  <Label className="dark:text-white text-sm">AI Pattern Analysis</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Allow AI to analyze adherence patterns for predictions</p>
                </div>
                <Switch
                  checked={formData.ai_data_sharing}
                  onCheckedChange={(checked) => setFormData({ ...formData, ai_data_sharing: checked })}
                  className="select-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 min-h-[44px]">
                <div>
                  <Label className="dark:text-white text-sm">Personalized AI Challenges</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Get AI-generated personalized adherence challenges</p>
                </div>
                <Switch
                  checked={formData.ai_personalization}
                  onCheckedChange={(checked) => setFormData({ ...formData, ai_personalization: checked })}
                  className="select-none"
                />
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>🔒 Your Privacy & Consent:</strong> All data is encrypted and stored securely. 
                  AI analysis happens within your private account and only uses data you've explicitly entered. 
                  We never share your health data with third parties or use it for advertising. 
                  By enabling AI features, you consent to automated pattern analysis for adherence support only - not medical diagnosis or advice.
                  You can export or delete your data at any time.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Personal Goals */}
          <Card className="shadow-md dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                Personal Goals
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Set your adherence targets for personalized challenges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target_streak" className="dark:text-white text-sm">Target Streak (days)</Label>
                <Input
                  id="target_streak"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.target_streak}
                  onChange={(e) => setFormData({ ...formData, target_streak: parseInt(e.target.value) || 0 })}
                  className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Your personal streak goal</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_adherence" className="dark:text-white text-sm">Target Adherence Rate (%)</Label>
                <Input
                  id="target_adherence"
                  type="number"
                  min="50"
                  max="100"
                  value={formData.target_adherence}
                  onChange={(e) => setFormData({ ...formData, target_adherence: parseInt(e.target.value) || 0 })}
                  className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Your target medication adherence percentage</p>
              </div>

              {formData.ai_personalization && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                  <p className="text-sm text-green-900 dark:text-green-200">
                    ✨ AI will use these goals to create personalized challenges tailored to your progress
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Display Preferences */}
          <Card className="shadow-md dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <SettingsIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                Display Preferences
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Customize how information is displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="time_format" className="dark:text-white text-sm">Time Format</Label>
                <MobileSelect
                  value={formData.time_format}
                  onValueChange={(value) => setFormData({ ...formData, time_format: value })}
                  placeholder="Time format"
                  options={[
                    { value: '12h', label: '12-hour (e.g., 3:00 PM)' },
                    { value: '24h', label: '24-hour (e.g., 15:00)' }
                  ]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme" className="dark:text-white text-sm">App Theme</Label>
                <MobileSelect
                  value={formData.theme}
                  onValueChange={(value) => setFormData({ ...formData, theme: value })}
                  placeholder="App theme"
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'auto', label: 'Auto (system)' }
                  ]}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">Theme applies automatically</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg min-h-[44px]">
                <div>
                  <Label className="dark:text-white text-sm">Disable System Gestures</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Prevent pull-to-refresh and swipe gestures</p>
                </div>
                <Switch
                  checked={formData.disable_system_gestures}
                  onCheckedChange={(checked) => setFormData({ ...formData, disable_system_gestures: checked })}
                  className="select-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Health App Integration */}
          <HealthDataExport />

          {/* Data Management */}
          <Card className="shadow-md border-l-4 border-l-orange-500 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Download className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                Data Management
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Export your data and manage your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <User className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Role: {user.role}</p>
                  </div>
                </div>
              </div>

              <Separator className="dark:bg-gray-700" />

              <div>
                <Button
                  onClick={handleExportData}
                  variant="outline"
                  className="w-full h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export All Data (JSON)
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Download all your medications, logs, check-ins, and achievements
                </p>
              </div>

              <Separator className="dark:bg-gray-700" />

              <div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full h-11 select-none"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="dark:text-white">Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="dark:text-gray-400">
                        This action cannot be undone. This will permanently delete all your medications, logs, check-ins, and achievements from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="h-11 bg-red-600 hover:bg-red-700 text-white"
                      >
                        Delete Everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  ⚠️ Warning: This will delete all your data and log you out
                </p>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                <p className="text-sm text-orange-900 dark:text-orange-200">
                  <strong>🔓 Your Data Rights:</strong> You have full control over your data. 
                  You can export, delete, or modify your information at any time. 
                  All data processing complies with privacy regulations.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="sticky bottom-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4">
            <Button
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 h-12 text-base select-none"
            >
              {saved ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Settings Saved!
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save All Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}