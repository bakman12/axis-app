import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Bell, Shield, Target, Download, User, Save, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Settings() {
  const [formData, setFormData] = useState({
    notification_enabled: true,
    notification_timing: 15,
    notification_sound: true,
    critical_only_notifications: false,
    ai_data_sharing: true,
    ai_personalization: true,
    target_streak: 30,
    target_adherence: 95,
    time_format: '12h',
    theme: 'light'
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
        critical_only_notifications: user.critical_only_notifications ?? false,
        ai_data_sharing: user.ai_data_sharing ?? true,
        ai_personalization: user.ai_personalization ?? true,
        target_streak: user.target_streak ?? 30,
        target_adherence: user.target_adherence ?? 95,
        time_format: user.time_format ?? '12h',
        theme: user.theme ?? 'light'
      });
    }
  }, [user]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      setSaved(true);
      toast.success('Settings saved successfully');
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <SettingsIcon className="w-9 h-9" />
            Settings
          </h1>
          <p className="text-gray-600">
            Customize your medication tracking experience
          </p>
        </div>

        <div className="space-y-6">
          {/* Notification Preferences */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Control how and when you receive medication reminders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label>Enable Notifications</Label>
                  <p className="text-xs text-gray-500">Receive medication reminders</p>
                </div>
                <Switch
                  checked={formData.notification_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, notification_enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timing">Notification Timing</Label>
                <Select
                  value={formData.notification_timing.toString()}
                  onValueChange={(value) => setFormData({ ...formData, notification_timing: parseInt(value) })}
                  disabled={!formData.notification_enabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">At scheduled time</SelectItem>
                    <SelectItem value="5">5 minutes before</SelectItem>
                    <SelectItem value="10">10 minutes before</SelectItem>
                    <SelectItem value="15">15 minutes before</SelectItem>
                    <SelectItem value="30">30 minutes before</SelectItem>
                    <SelectItem value="60">1 hour before</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label>Notification Sound</Label>
                  <p className="text-xs text-gray-500">Play sound with notifications</p>
                </div>
                <Switch
                  checked={formData.notification_sound}
                  onCheckedChange={(checked) => setFormData({ ...formData, notification_sound: checked })}
                  disabled={!formData.notification_enabled}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label>Critical Medications Only</Label>
                  <p className="text-xs text-gray-500">Only notify for critical time-sensitive meds</p>
                </div>
                <Switch
                  checked={formData.critical_only_notifications}
                  onCheckedChange={(checked) => setFormData({ ...formData, critical_only_notifications: checked })}
                  disabled={!formData.notification_enabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy & AI Settings */}
          <Card className="shadow-md border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Privacy & AI Features
              </CardTitle>
              <CardDescription>
                Control how AI analyzes your data and provides insights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div>
                  <Label>AI Pattern Analysis</Label>
                  <p className="text-xs text-gray-600">Allow AI to analyze adherence patterns for predictions</p>
                </div>
                <Switch
                  checked={formData.ai_data_sharing}
                  onCheckedChange={(checked) => setFormData({ ...formData, ai_data_sharing: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div>
                  <Label>Personalized AI Challenges</Label>
                  <p className="text-xs text-gray-600">Get AI-generated personalized adherence challenges</p>
                </div>
                <Switch
                  checked={formData.ai_personalization}
                  onCheckedChange={(checked) => setFormData({ ...formData, ai_personalization: checked })}
                />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>🔒 Your Privacy:</strong> All data is encrypted and stored securely. 
                  AI analysis happens within your private account. We never share your health data with third parties. 
                  You can export or delete your data at any time.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Personal Goals */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-600" />
                Personal Goals
              </CardTitle>
              <CardDescription>
                Set your adherence targets for personalized challenges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target_streak">Target Streak (days)</Label>
                <Input
                  id="target_streak"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.target_streak}
                  onChange={(e) => setFormData({ ...formData, target_streak: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-500">Your personal streak goal</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_adherence">Target Adherence Rate (%)</Label>
                <Input
                  id="target_adherence"
                  type="number"
                  min="50"
                  max="100"
                  value={formData.target_adherence}
                  onChange={(e) => setFormData({ ...formData, target_adherence: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-500">Your target medication adherence percentage</p>
              </div>

              {formData.ai_personalization && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-900">
                    ✨ AI will use these goals to create personalized challenges tailored to your progress
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Display Preferences */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-gray-600" />
                Display Preferences
              </CardTitle>
              <CardDescription>
                Customize how information is displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="time_format">Time Format</Label>
                <Select
                  value={formData.time_format}
                  onValueChange={(value) => setFormData({ ...formData, time_format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12-hour (e.g., 3:00 PM)</SelectItem>
                    <SelectItem value="24h">24-hour (e.g., 15:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">App Theme</Label>
                <Select
                  value={formData.theme}
                  onValueChange={(value) => setFormData({ ...formData, theme: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto (system)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Dark theme coming soon</p>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="shadow-md border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-orange-600" />
                Data Management
              </CardTitle>
              <CardDescription>
                Export your data and manage your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <User className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500 mt-1">Role: {user.role}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Button
                  onClick={handleExportData}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export All Data (JSON)
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Download all your medications, logs, check-ins, and achievements
                </p>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-900">
                  <strong>🔓 Your Data Rights:</strong> You have full control over your data. 
                  You can export, delete, or modify your information at any time. 
                  All data processing complies with privacy regulations.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="sticky bottom-4 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
            <Button
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
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