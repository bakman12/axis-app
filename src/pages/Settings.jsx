import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { entities } from '@/lib/encryptedBase44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Separator } from '@/components/ui/separator';
import {
  Bell, Shield, Target, Download, User, Save, CheckCircle, Trash2, Lock, Timer,
  ChevronRight, ChevronLeft, Monitor, Heart, Archive,
} from 'lucide-react';
import HealthDataExport from '@/components/HealthDataExport';
import EnhancedDataExport from '@/components/EnhancedDataExport';
import HealthDataIntegration from '@/components/HealthDataIntegration';
import EmergencyIDSetup from '@/components/EmergencyIDSetup';
import { getAutoLockTimeout, setAutoLockTimeout } from '@/lib/AutoLock';
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
import AuditLogViewer from '@/components/AuditLogViewer';
import PinChange from '@/components/PinChange';
import EncryptedBackup from '@/components/EncryptedBackup';

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_LOCK_OPTIONS = [
  { value: '30000',  label: '30 seconds' },
  { value: '60000',  label: '1 minute' },
  { value: '300000', label: '5 minutes' },
  { value: '900000', label: '15 minutes' },
  { value: '0',      label: 'Never (not recommended)' },
];

const DEFAULT_FORM = {
  notification_enabled: true,
  reminder_minutes_before: 15,
  notification_sound: true,
  notification_sound_type: 'default',
  critical_notification_sound: 'urgent',
  vibration_pattern: 'medium',
  notification_duration: 5,
  critical_notification_duration: 30,
  reminder_sound_type: 'default',
  critical_only_notifications: false,
  snooze_enabled: true,
  snooze_duration: 10,
  priority_notifications: true,
  critical_medication_alert: true,
  ai_data_sharing: true,
  ai_personalization: true,
  ai_health_coach: true,
  ai_assistant: true,
  ai_insights: true,
  target_streak: 30,
  target_adherence: 95,
  time_format: '12h',
  theme: 'light',
  disable_system_gestures: false,
};

// ─── Sub-page shell ───────────────────────────────────────────────────────────

function SectionPage({ title, onBack, onSave, saving, saved, showSave = false, children }) {
  return (
    <div
      className="fixed inset-0 bg-gray-50 dark:bg-gray-950 z-20 flex flex-col overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* iOS-style top bar */}
      <div className="flex items-center px-2 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 flex-shrink-0 min-h-[52px]">
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 px-2 py-2 rounded-lg text-blue-600 dark:text-blue-400 min-h-[44px] min-w-[44px]"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Settings</span>
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold text-gray-900 dark:text-white pointer-events-none">
          {title}
        </h1>
        {showSave && (
          <button
            onClick={onSave}
            disabled={saving}
            className="ml-auto px-2 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 min-h-[44px]"
          >
            {saved ? 'Saved!' : saving ? '…' : 'Save'}
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-2xl mx-auto p-4 pb-12 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Menu row ─────────────────────────────────────────────────────────────────

function SettingsRow({ icon: Icon, color, title, subtitle, onPress }) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition-colors select-none min-h-[52px]"
    >
      <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
    </button>
  );
}

// ─── Section: Notifications ───────────────────────────────────────────────────

function NotificationsSection({ formData, setFormData, onSave, saving, saved }) {
  const fd = formData;
  const set = (patch) => setFormData(prev => ({ ...prev, ...patch }));

  return (
    <SectionPage title="Notifications" onBack={onSave} saving={saving} saved={saved} showSave onSave={onSave}>
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-700">
          <div className="flex items-center justify-between px-4 py-3 min-h-[52px]">
            <div>
              <p className="text-sm font-medium dark:text-white">Enable Notifications</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Receive medication reminders</p>
            </div>
            <Switch checked={fd.notification_enabled} onCheckedChange={v => set({ notification_enabled: v })} className="select-none" />
          </div>

          <div className="px-4 py-3 space-y-1">
            <p className="text-sm font-medium dark:text-white">Reminder Lead Time</p>
            <MobileSelect
              value={fd.reminder_minutes_before?.toString()}
              onValueChange={v => set({ reminder_minutes_before: parseInt(v) })}
              disabled={!fd.notification_enabled}
              options={[
                { value: '5',  label: '5 minutes before' },
                { value: '10', label: '10 minutes before' },
                { value: '15', label: '15 minutes before' },
                { value: '20', label: '20 minutes before' },
                { value: '30', label: '30 minutes before' },
                { value: '60', label: '1 hour before' },
              ]}
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3 min-h-[52px]">
            <p className="text-sm font-medium dark:text-white">Notification Sound</p>
            <Switch checked={fd.notification_sound} onCheckedChange={v => set({ notification_sound: v })} disabled={!fd.notification_enabled} className="select-none" />
          </div>

          <div className="flex items-center justify-between px-4 py-3 min-h-[52px]">
            <p className="text-sm font-medium dark:text-white">Critical Medications Only</p>
            <Switch checked={fd.critical_only_notifications} onCheckedChange={v => set({ critical_only_notifications: v })} disabled={!fd.notification_enabled} className="select-none" />
          </div>

          <div className="flex items-center justify-between px-4 py-3 min-h-[52px]">
            <p className="text-sm font-medium dark:text-white">Dynamic Priority</p>
            <Switch checked={fd.priority_notifications} onCheckedChange={v => set({ priority_notifications: v })} disabled={!fd.notification_enabled} className="select-none" />
          </div>

          <div className="flex items-center justify-between px-4 py-3 min-h-[52px]">
            <div>
              <p className="text-sm font-medium dark:text-white">Critical Medication Alerts</p>
              <p className="text-xs text-red-600 dark:text-red-400">Enhanced reminders with escalating alerts</p>
            </div>
            <Switch checked={fd.critical_medication_alert} onCheckedChange={v => set({ critical_medication_alert: v })} disabled={!fd.notification_enabled} className="select-none" />
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm dark:text-white">Snooze</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-700">
          <div className="flex items-center justify-between px-4 py-3 min-h-[52px]">
            <p className="text-sm font-medium dark:text-white">Snooze Functionality</p>
            <Switch checked={fd.snooze_enabled} onCheckedChange={v => set({ snooze_enabled: v })} disabled={!fd.notification_enabled} className="select-none" />
          </div>
          {fd.snooze_enabled && (
            <div className="px-4 py-3 space-y-1">
              <p className="text-sm font-medium dark:text-white">Snooze Duration</p>
              <MobileSelect
                value={fd.snooze_duration?.toString()}
                onValueChange={v => set({ snooze_duration: parseInt(v) })}
                disabled={!fd.notification_enabled}
                options={[
                  { value: '5',  label: '5 minutes' },
                  { value: '10', label: '10 minutes' },
                  { value: '15', label: '15 minutes' },
                  { value: '20', label: '20 minutes' },
                  { value: '30', label: '30 minutes' },
                ]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm dark:text-white">Sound & Vibration</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-700">
          <div className="px-4 py-3 space-y-1">
            <p className="text-sm font-medium dark:text-white">Reminder Sound</p>
            <MobileSelect
              value={fd.reminder_sound_type}
              onValueChange={v => set({ reminder_sound_type: v })}
              disabled={!fd.notification_enabled || !fd.notification_sound}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'gentle', label: 'Gentle' },
                { value: 'chime',  label: 'Chime' },
                { value: 'bell',   label: 'Bell' },
                { value: 'alert',  label: 'Alert' },
              ]}
            />
          </div>
          {fd.notification_sound && (
            <>
              <div className="px-4 py-3 space-y-1">
                <p className="text-sm font-medium dark:text-white">Normal Medications Sound</p>
                <MobileSelect
                  value={fd.notification_sound_type}
                  onValueChange={v => set({ notification_sound_type: v })}
                  disabled={!fd.notification_enabled}
                  options={[
                    { value: 'default', label: 'Default' },
                    { value: 'gentle',  label: 'Gentle' },
                    { value: 'chime',   label: 'Chime' },
                    { value: 'beep',    label: 'Beep' },
                  ]}
                />
              </div>
              <div className="px-4 py-3 space-y-1">
                <p className="text-sm font-medium dark:text-white">Critical Medications Sound</p>
                <MobileSelect
                  value={fd.critical_notification_sound}
                  onValueChange={v => set({ critical_notification_sound: v })}
                  disabled={!fd.notification_enabled}
                  options={[
                    { value: 'urgent',  label: 'Urgent (Recommended)' },
                    { value: 'default', label: 'Default' },
                    { value: 'gentle',  label: 'Gentle' },
                    { value: 'chime',   label: 'Chime' },
                  ]}
                />
              </div>
            </>
          )}
          <div className="px-4 py-3 space-y-1">
            <p className="text-sm font-medium dark:text-white">Vibration Pattern</p>
            <MobileSelect
              value={fd.vibration_pattern}
              onValueChange={v => set({ vibration_pattern: v })}
              disabled={!fd.notification_enabled}
              options={[
                { value: 'short',  label: 'Short (1 pulse)' },
                { value: 'medium', label: 'Medium (2 pulses)' },
                { value: 'long',   label: 'Long (3 pulses)' },
                { value: 'custom', label: 'Urgent (rapid pulses)' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm dark:text-white">Display Duration</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-700">
          <div className="px-4 py-3 space-y-1">
            <p className="text-sm font-medium dark:text-white">Normal Medications</p>
            <MobileSelect
              value={fd.notification_duration?.toString()}
              onValueChange={v => set({ notification_duration: parseInt(v) })}
              disabled={!fd.notification_enabled}
              options={[
                { value: '3',  label: '3 seconds' },
                { value: '5',  label: '5 seconds' },
                { value: '8',  label: '8 seconds' },
                { value: '10', label: '10 seconds' },
                { value: '15', label: '15 seconds' },
              ]}
            />
          </div>
          <div className="px-4 py-3 space-y-1">
            <p className="text-sm font-medium dark:text-white">Critical Medications</p>
            <MobileSelect
              value={fd.critical_notification_duration?.toString()}
              onValueChange={v => set({ critical_notification_duration: parseInt(v) })}
              disabled={!fd.notification_enabled}
              options={[
                { value: '10', label: '10 seconds' },
                { value: '20', label: '20 seconds' },
                { value: '30', label: '30 seconds' },
                { value: '45', label: '45 seconds' },
                { value: '60', label: '1 minute' },
              ]}
            />
          </div>
        </CardContent>
      </Card>
    </SectionPage>
  );
}

// ─── Section: Privacy & AI ────────────────────────────────────────────────────

function AISection({ formData, setFormData, onSave, saving, saved }) {
  const fd = formData;
  const set = (patch) => setFormData(prev => ({ ...prev, ...patch }));

  return (
    <SectionPage title="Privacy & AI" onBack={onSave} saving={saving} saved={saved} showSave onSave={onSave}>
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-700">
          {[
            { key: 'ai_data_sharing',    label: 'AI Pattern Analysis',         desc: 'Analyses your history to predict when you need extra reminders' },
            { key: 'ai_personalization', label: 'Personalised Challenges',      desc: 'Creates weekly challenges based on your adherence patterns' },
            { key: 'ai_health_coach',    label: 'AI Health Coach',              desc: 'Chat with an AI coach for wellness advice on the Coach page' },
            { key: 'ai_assistant',       label: 'AI Assistant',                 desc: 'Quick-help AI card on your home page' },
            { key: 'ai_insights',        label: 'Predictive Insights',          desc: 'AI-generated insights about potential adherence issues' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center gap-3 px-4 py-3 min-h-[60px]">
              <div className="flex-1">
                <p className="text-sm font-medium dark:text-white">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
              </div>
              <Switch
                checked={fd[key]}
                onCheckedChange={v => set({ [key]: v })}
                className="select-none flex-shrink-0"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-xs text-blue-900 dark:text-blue-200">
        <strong>Your Privacy:</strong> All data is encrypted and stored securely. AI analysis happens within your private account only — never shared with third parties or used for advertising.
      </div>
    </SectionPage>
  );
}

// ─── Section: Goals ───────────────────────────────────────────────────────────

function GoalsSection({ formData, setFormData, onSave, saving, saved }) {
  const fd = formData;
  const set = (patch) => setFormData(prev => ({ ...prev, ...patch }));

  return (
    <SectionPage title="Goals" onBack={onSave} saving={saving} saved={saved} showSave onSave={onSave}>
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="dark:text-white text-sm">Target Streak (days)</Label>
            <Input
              type="number" min="1" max="365"
              value={fd.target_streak}
              onChange={e => set({ target_streak: parseInt(e.target.value) || 0 })}
              className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Your personal consecutive-days goal</p>
          </div>

          <div className="space-y-2">
            <Label className="dark:text-white text-sm">Target Adherence Rate (%)</Label>
            <Input
              type="number" min="50" max="100"
              value={fd.target_adherence}
              onChange={e => set({ target_adherence: parseInt(e.target.value) || 0 })}
              className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Target medication adherence percentage</p>
          </div>

          {fd.ai_personalization && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-xs text-green-900 dark:text-green-200">
              AI will use these goals to create personalised weekly challenges.
            </div>
          )}
        </CardContent>
      </Card>
    </SectionPage>
  );
}

// ─── Section: Display ─────────────────────────────────────────────────────────

function DisplaySection({ formData, setFormData, onSave, saving, saved }) {
  const fd = formData;
  const set = (patch) => setFormData(prev => ({ ...prev, ...patch }));

  return (
    <SectionPage title="Display" onBack={onSave} saving={saving} saved={saved} showSave onSave={onSave}>
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-700">
          <div className="px-4 py-3 space-y-1">
            <p className="text-sm font-medium dark:text-white">Time Format</p>
            <MobileSelect
              value={fd.time_format}
              onValueChange={v => set({ time_format: v })}
              options={[
                { value: '12h', label: '12-hour (e.g. 3:00 PM)' },
                { value: '24h', label: '24-hour (e.g. 15:00)' },
              ]}
            />
          </div>

          <div className="px-4 py-3 space-y-1">
            <p className="text-sm font-medium dark:text-white">App Theme</p>
            <MobileSelect
              value={fd.theme}
              onValueChange={v => {
                set({ theme: v });
                localStorage.setItem('axis_theme', v);
                document.documentElement.classList.toggle(
                  'dark',
                  v === 'dark' || (v === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches),
                );
              }}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark',  label: 'Dark' },
                { value: 'auto',  label: 'System default' },
              ]}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Changes apply instantly</p>
          </div>

          <div className="flex items-center justify-between px-4 py-3 min-h-[52px]">
            <div>
              <p className="text-sm font-medium dark:text-white">Disable System Gestures</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Prevent pull-to-refresh and swipe gestures</p>
            </div>
            <Switch checked={fd.disable_system_gestures} onCheckedChange={v => set({ disable_system_gestures: v })} className="select-none" />
          </div>
        </CardContent>
      </Card>
    </SectionPage>
  );
}

// ─── Section: Security ────────────────────────────────────────────────────────

function SecuritySection({ autoLockTimeout, handleAutoLockChange, onBack }) {
  return (
    <SectionPage title="Security" onBack={onBack}>
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm dark:text-white flex items-center gap-2">
            <Timer className="w-4 h-4 text-orange-500" />
            Auto-lock
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-700">
          <div className="px-4 py-3">
            <MobileSelect
              value={autoLockTimeout}
              onValueChange={handleAutoLockChange}
              options={AUTO_LOCK_OPTIONS}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              App locks and clears decrypted data after this period of inactivity
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl text-xs text-orange-900 dark:text-orange-200 space-y-1">
        <p><strong>Black Box Mode:</strong> All medication data is encrypted with AES-256-GCM. The key never leaves your device.</p>
        <p>• Screenshots and screen recording are blocked</p>
        <p>• Biometric (fingerprint / Face ID) + PIN fallback</p>
        <p>• Emergency Medical ID always accessible without unlocking</p>
      </div>

      <PinChange />
      <EmergencyIDSetup />
      <AuditLogViewer />
    </SectionPage>
  );
}

// ─── Section: Health Data ─────────────────────────────────────────────────────

function HealthDataSection({ onBack }) {
  return (
    <SectionPage title="Health Data" onBack={onBack}>
      <HealthDataExport />
      <HealthDataIntegration />
    </SectionPage>
  );
}

// ─── Section: Backup & Export ─────────────────────────────────────────────────

function BackupSection({ user, onBack, handleExportData }) {
  return (
    <SectionPage title="Backup & Export" onBack={onBack}>
      <EncryptedBackup />

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-sm dark:text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-500" />
            Raw Data Export
          </CardTitle>
          <CardDescription className="dark:text-gray-400 text-xs">
            Download all your data as a JSON file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleExportData}
            variant="outline"
            className="w-full h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Export All Data (JSON)
          </Button>
        </CardContent>
      </Card>

      <EnhancedDataExport user={user} />
    </SectionPage>
  );
}

// ─── Section: Account ─────────────────────────────────────────────────────────

function AccountSection({ user, onBack, handleExportData, handleDeleteAccount }) {
  const navigate = useNavigate();
  return (
    <SectionPage title="Account" onBack={onBack}>
      {user && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{user.full_name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Role: {user.role}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-0">
          <button
            onClick={() => navigate(createPageUrl('PrivacyPolicy'))}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Shield className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </span>
              <span className="text-sm font-medium dark:text-white">Privacy Policy</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-900 dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-sm text-red-700 dark:text-red-400">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full h-11 select-none">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Account Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="dark:text-white">Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="dark:text-gray-400">
                  This permanently deletes all your medications, logs, and achievements. This action cannot be undone.
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
          <p className="text-xs text-red-600 dark:text-red-400">
            ⚠️ All data will be deleted and you will need to restart the app.
          </p>
        </CardContent>
      </Card>
    </SectionPage>
  );
}

// ─── Main Settings page ───────────────────────────────────────────────────────

export default function Settings() {
  const [section, setSection]   = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [saved, setSaved]       = useState(false);
  const [autoLockTimeout, setAutoLockTimeoutState] = useState(() => String(getAutoLockTimeout()));

  const handleAutoLockChange = (value) => {
    setAutoLockTimeoutState(value);
    setAutoLockTimeout(parseInt(value, 10));
  };

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (user) {
      const storedTheme = localStorage.getItem('axis_theme');
      setFormData({
        notification_enabled:           user.notification_enabled           ?? true,
        reminder_minutes_before:        user.reminder_minutes_before        ?? 15,
        notification_sound:             user.notification_sound             ?? true,
        notification_sound_type:        user.notification_sound_type        ?? 'default',
        critical_notification_sound:    user.critical_notification_sound    ?? 'urgent',
        vibration_pattern:              user.vibration_pattern              ?? 'medium',
        notification_duration:          user.notification_duration          ?? 5,
        critical_notification_duration: user.critical_notification_duration ?? 30,
        reminder_sound_type:            user.reminder_sound_type            ?? 'default',
        critical_only_notifications:    user.critical_only_notifications    ?? false,
        snooze_enabled:                 user.snooze_enabled                 ?? true,
        snooze_duration:                user.snooze_duration                ?? 10,
        priority_notifications:         user.priority_notifications         ?? true,
        critical_medication_alert:      user.critical_medication_alert      ?? true,
        ai_data_sharing:                user.ai_data_sharing                ?? true,
        ai_personalization:             user.ai_personalization             ?? true,
        ai_health_coach:                user.ai_health_coach                ?? true,
        ai_assistant:                   user.ai_assistant                   ?? true,
        ai_insights:                    user.ai_insights                    ?? true,
        target_streak:                  user.target_streak                  ?? 30,
        target_adherence:               user.target_adherence               ?? 95,
        time_format:                    user.time_format                    ?? '12h',
        theme:                          storedTheme || user.theme           || 'light',
        disable_system_gestures:        user.disable_system_gestures        ?? false,
      });
    }
  }, [user]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      setSaved(true);
      toast.success('Settings saved');
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
    setSection(null);
  };

  const handleExportData = async () => {
    try {
      const [medications, logs, checkIns, achievements] = await Promise.all([
        entities.Medication.list(),
        entities.MedicationLog.list('-created_date', 1000),
        entities.CheckIn.list('-created_date', 1000),
        entities.Achievement.list(),
      ]);
      const blob = new Blob([JSON.stringify({
        export_date: new Date().toISOString(),
        user: { email: user?.email, full_name: user?.full_name },
        medications, logs, checkIns, achievements,
      }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medication-data-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported');
    } catch {
      toast.error('Failed to export data');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const [medications, logs, checkIns, achievements] = await Promise.all([
        entities.Medication.list(),
        entities.MedicationLog.list(),
        entities.CheckIn.list(),
        entities.Achievement.list(),
      ]);
      await Promise.all([
        ...medications.map(m => entities.Medication.delete(m.id)),
        ...logs.map(l => entities.MedicationLog.delete(l.id)),
        ...checkIns.map(c => entities.CheckIn.delete(c.id)),
        ...achievements.map(a => entities.Achievement.delete(a.id)),
      ]);

      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('axis_local_') ||
            ['axis_audit_log', 'axis_symptom_log', 'axis_refill_snooze'].includes(key)) {
          localStorage.removeItem(key);
        }
      }

      const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
      if (isNative) {
        toast.success('All data deleted. Restart the app to start fresh.');
        setTimeout(() => window.location.replace('/'), 1500);
      } else {
        toast.success('Account data deleted successfully');
        setTimeout(() => {
          localStorage.removeItem('base44_access_token');
          localStorage.removeItem('token');
          window.location.replace('/');
        }, 1500);
      }
    } catch {
      toast.error('Failed to delete account data');
    }
  };

  // ── Section routing ────────────────────────────────────────────────────────

  if (section === 'notifications') {
    return (
      <NotificationsSection
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        saving={updateSettingsMutation.isPending}
        saved={saved}
      />
    );
  }

  if (section === 'ai') {
    return (
      <AISection
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        saving={updateSettingsMutation.isPending}
        saved={saved}
      />
    );
  }

  if (section === 'goals') {
    return (
      <GoalsSection
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        saving={updateSettingsMutation.isPending}
        saved={saved}
      />
    );
  }

  if (section === 'display') {
    return (
      <DisplaySection
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        saving={updateSettingsMutation.isPending}
        saved={saved}
      />
    );
  }

  if (section === 'security') {
    return (
      <SecuritySection
        autoLockTimeout={autoLockTimeout}
        handleAutoLockChange={handleAutoLockChange}
        onBack={() => setSection(null)}
      />
    );
  }

  if (section === 'health') {
    return <HealthDataSection onBack={() => setSection(null)} />;
  }

  if (section === 'backup') {
    return (
      <BackupSection
        user={user}
        onBack={() => setSection(null)}
        handleExportData={handleExportData}
      />
    );
  }

  if (section === 'account') {
    return (
      <AccountSection
        user={user}
        onBack={() => setSection(null)}
        handleExportData={handleExportData}
        handleDeleteAccount={handleDeleteAccount}
      />
    );
  }

  // ── Main menu ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ overscrollBehavior: 'none' }}>
      <RootPageHeader title="Settings" subtitle="Tap a section to configure" />
      <div className="max-w-2xl mx-auto pb-24" style={{ overscrollBehavior: 'none' }}>

        <div className="px-4 py-2">
          <PrivacyNotice />
        </div>

        {/* App settings group */}
        <p className="px-5 pt-4 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          App Settings
        </p>
        <div className="mx-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 shadow-sm">
          <SettingsRow icon={Bell}    color="bg-blue-500"   title="Notifications"  subtitle="Reminders, sounds, snooze"   onPress={() => setSection('notifications')} />
          <SettingsRow icon={Shield}  color="bg-purple-500" title="Privacy & AI"   subtitle="Data sharing and AI features" onPress={() => setSection('ai')} />
          <SettingsRow icon={Target}  color="bg-green-500"  title="Goals"          subtitle="Streak and adherence targets" onPress={() => setSection('goals')} />
          <SettingsRow icon={Monitor} color="bg-gray-500"   title="Display"        subtitle="Theme and time format"        onPress={() => setSection('display')} />
        </div>

        {/* Data & Security group */}
        <p className="px-5 pt-5 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Data & Security
        </p>
        <div className="mx-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 shadow-sm">
          <SettingsRow icon={Lock}    color="bg-orange-500" title="Security"       subtitle="PIN, biometrics, auto-lock"   onPress={() => setSection('security')} />
          <SettingsRow icon={Heart}   color="bg-red-500"    title="Health Data"    subtitle="Integrations and exports"     onPress={() => setSection('health')} />
          <SettingsRow icon={Archive} color="bg-teal-500"   title="Backup & Export" subtitle="Encrypted backup, JSON export" onPress={() => setSection('backup')} />
        </div>

        {/* Account group */}
        <p className="px-5 pt-5 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Account
        </p>
        <div className="mx-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 shadow-sm">
          <SettingsRow icon={User} color="bg-indigo-500" title="Account" subtitle={user?.email ?? 'Profile and data management'} onPress={() => setSection('account')} />
        </div>

      </div>
    </div>
  );
}
