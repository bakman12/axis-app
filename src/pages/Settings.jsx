import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { entities } from '@/lib/encryptedBase44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { MobileSelect } from '@/components/ui/mobile-select';
import {
  Bell, Shield, Target, Download, User, Trash2, Lock, Timer,
  ChevronRight, ChevronLeft, Monitor, Heart, Archive, Share2,
} from 'lucide-react';
import { isConsentActive } from '@/lib/clinicSync';
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

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };
const sans  = { fontFamily: 'Inter, sans-serif' };

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

// ─── Shared primitives ────────────────────────────────────────────────────────

const card = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 14,
  overflow: 'hidden',
};

const divider = { borderTop: '1px solid hsl(var(--border))' };

function SectionLabel({ children }) {
  return (
    <p style={{ ...sans, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: 10, paddingLeft: 2 }}>
      {children}
    </p>
  );
}

function Row({ children, style }) {
  return (
    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 52, ...style }}>
      {children}
    </div>
  );
}

function RowLabel({ label, desc }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ ...sans, fontSize: '0.85rem', fontWeight: 500, color: 'hsl(var(--foreground))' }}>{label}</p>
      {desc && <p style={{ ...sans, fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>{desc}</p>}
    </div>
  );
}

// ─── Sub-page shell ───────────────────────────────────────────────────────────

function SectionPage({ title, onBack, onSave, saving, saved, showSave = false, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'hsl(var(--background))', zIndex: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 4px',
        background: 'hsl(var(--background) / 0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid hsl(var(--border))',
        flexShrink: 0, minHeight: 52, position: 'relative',
      }}>
        <button
          onClick={onBack}
          style={{ ...sans, display: 'flex', alignItems: 'center', gap: 2, padding: '8px 12px', color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, minHeight: 44, minWidth: 44 }}
        >
          <ChevronLeft style={{ width: 18, height: 18 }} />
          Settings
        </button>
        <h1 style={{ ...sans, position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '1rem', fontWeight: 600, color: 'hsl(var(--foreground))', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          {title}
        </h1>
        {showSave && (
          <button
            onClick={onSave}
            disabled={saving}
            style={{ ...sans, marginLeft: 'auto', padding: '8px 12px', color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, minHeight: 44 }}
          >
            {saved ? 'Saved!' : saving ? '…' : 'Save'}
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Menu row ─────────────────────────────────────────────────────────────────

function SettingsRow({ icon: Icon, title, subtitle, onPress }) {
  return (
    <button
      onClick={onPress}
      style={{ ...sans, width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'hsl(var(--card))', border: 'none', cursor: 'pointer', textAlign: 'left', minHeight: 56, transition: 'opacity 0.15s' }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(199,91,58,0.1)' }}>
        <Icon style={{ width: 18, height: 18, color: 'hsl(var(--primary))' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ ...sans, fontSize: '0.88rem', fontWeight: 500, color: 'hsl(var(--foreground))' }}>{title}</p>
        {subtitle && (
          <p style={{ ...sans, fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</p>
        )}
      </div>
      <ChevronRight style={{ width: 15, height: 15, color: 'hsl(var(--muted-foreground))', flexShrink: 0, opacity: 0.5 }} />
    </button>
  );
}

// ─── Section: Notifications ───────────────────────────────────────────────────

function NotificationsSection({ formData, setFormData, onSave, saving, saved }) {
  const fd = formData;
  const set = (patch) => setFormData(prev => ({ ...prev, ...patch }));

  return (
    <SectionPage title="Notifications" onBack={onSave} saving={saving} saved={saved} showSave onSave={onSave}>

      <div>
        <SectionLabel>General</SectionLabel>
        <div style={card}>
          <Row>
            <RowLabel label="Enable Notifications" desc="Receive medication reminders" />
            <Switch checked={fd.notification_enabled} onCheckedChange={v => set({ notification_enabled: v })} />
          </Row>
          <div style={divider}>
            <div style={{ padding: '14px 16px' }}>
              <p style={{ ...sans, fontSize: '0.85rem', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 8 }}>Reminder Lead Time</p>
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
          </div>
          <Row style={divider}>
            <RowLabel label="Notification Sound" />
            <Switch checked={fd.notification_sound} onCheckedChange={v => set({ notification_sound: v })} disabled={!fd.notification_enabled} />
          </Row>
          <Row style={divider}>
            <RowLabel label="Critical Medications Only" />
            <Switch checked={fd.critical_only_notifications} onCheckedChange={v => set({ critical_only_notifications: v })} disabled={!fd.notification_enabled} />
          </Row>
          <Row style={divider}>
            <RowLabel label="Dynamic Priority" />
            <Switch checked={fd.priority_notifications} onCheckedChange={v => set({ priority_notifications: v })} disabled={!fd.notification_enabled} />
          </Row>
          <Row style={divider}>
            <RowLabel label="Critical Medication Alerts" desc="Enhanced reminders with escalating alerts" />
            <Switch checked={fd.critical_medication_alert} onCheckedChange={v => set({ critical_medication_alert: v })} disabled={!fd.notification_enabled} />
          </Row>
        </div>
      </div>

      <div>
        <SectionLabel>Snooze</SectionLabel>
        <div style={card}>
          <Row>
            <RowLabel label="Snooze Functionality" />
            <Switch checked={fd.snooze_enabled} onCheckedChange={v => set({ snooze_enabled: v })} disabled={!fd.notification_enabled} />
          </Row>
          {fd.snooze_enabled && (
            <div style={{ ...divider, padding: '14px 16px' }}>
              <p style={{ ...sans, fontSize: '0.85rem', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 8 }}>Snooze Duration</p>
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
        </div>
      </div>

      <div>
        <SectionLabel>Sound & Vibration</SectionLabel>
        <div style={card}>
          <div style={{ padding: '14px 16px' }}>
            <p style={{ ...sans, fontSize: '0.85rem', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 8 }}>Reminder Sound</p>
            <MobileSelect
              value={fd.reminder_sound_type}
              onValueChange={v => set({ reminder_sound_type: v })}
              disabled={!fd.notification_enabled || !fd.notification_sound}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'gentle',  label: 'Gentle' },
                { value: 'chime',   label: 'Chime' },
                { value: 'bell',    label: 'Bell' },
                { value: 'alert',   label: 'Alert' },
              ]}
            />
          </div>
          {fd.notification_sound && (
            <>
              <div style={{ ...divider, padding: '14px 16px' }}>
                <p style={{ ...sans, fontSize: '0.85rem', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 8 }}>Normal Medications Sound</p>
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
              <div style={{ ...divider, padding: '14px 16px' }}>
                <p style={{ ...sans, fontSize: '0.85rem', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 8 }}>Critical Medications Sound</p>
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
          <div style={{ ...divider, padding: '14px 16px' }}>
            <p style={{ ...sans, fontSize: '0.85rem', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 8 }}>Vibration Pattern</p>
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
        </div>
      </div>

      <div>
        <SectionLabel>Display Duration</SectionLabel>
        <div style={card}>
          <div style={{ padding: '14px 16px' }}>
            <p style={{ ...sans, fontSize: '0.85rem', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 8 }}>Normal Medications</p>
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
          <div style={{ ...divider, padding: '14px 16px' }}>
            <p style={{ ...sans, fontSize: '0.85rem', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 8 }}>Critical Medications</p>
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
        </div>
      </div>

    </SectionPage>
  );
}

// ─── Section: Privacy & AI ────────────────────────────────────────────────────

function AISection({ formData, setFormData, onSave, saving, saved }) {
  const fd = formData;
  const set = (patch) => setFormData(prev => ({ ...prev, ...patch }));

  const rows = [
    { key: 'ai_data_sharing',    label: 'AI Pattern Analysis',    desc: 'Analyses your history to predict when you need extra reminders' },
    { key: 'ai_personalization', label: 'Personalised Challenges', desc: 'Creates weekly challenges based on your adherence patterns' },
    { key: 'ai_health_coach',    label: 'AI Health Coach',         desc: 'Chat with an AI coach for wellness advice on the Coach page' },
    { key: 'ai_assistant',       label: 'AI Assistant',            desc: 'Quick-help AI card on your home page' },
    { key: 'ai_insights',        label: 'Predictive Insights',     desc: 'AI-generated insights about potential adherence issues' },
  ];

  return (
    <SectionPage title="Privacy & AI" onBack={onSave} saving={saving} saved={saved} showSave onSave={onSave}>
      <div style={card}>
        {rows.map(({ key, label, desc }, i) => (
          <Row key={key} style={i > 0 ? divider : {}}>
            <RowLabel label={label} desc={desc} />
            <Switch checked={fd[key]} onCheckedChange={v => set({ [key]: v })} />
          </Row>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, padding: '14px 16px', background: 'rgba(199,91,58,0.06)', border: '1px solid rgba(199,91,58,0.2)', borderRadius: 12 }}>
        <Shield style={{ width: 16, height: 16, color: 'hsl(var(--primary))', flexShrink: 0, marginTop: 2 }} />
        <p style={{ ...sans, fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.6 }}>
          <strong style={{ color: 'hsl(var(--foreground))' }}>Your Privacy:</strong> All data is encrypted and stored securely. AI analysis happens within your private account only — never shared with third parties or used for advertising.
        </p>
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
      <div style={card}>
        <div style={{ padding: '14px 16px' }}>
          <p style={{ ...sans, fontSize: '0.85rem', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 4 }}>Target Streak (days)</p>
          <p style={{ ...sans, fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>Your personal consecutive-days goal</p>
          <input
            type="number" min="1" max="365"
            value={fd.target_streak}
            onChange={e => set({ target_streak: parseInt(e.target.value) || 0 })}
            style={{ ...sans, width: '100%', padding: '10px 12px', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: '0.9rem', color: 'hsl(var(--foreground))', outline: 'none' }}
          />
        </div>
        <div style={{ ...divider, padding: '14px 16px' }}>
          <p style={{ ...sans, fontSize: '0.85rem', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 4 }}>Target Adherence Rate (%)</p>
          <p style={{ ...sans, fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>Target medication adherence percentage</p>
          <input
            type="number" min="50" max="100"
            value={fd.target_adherence}
            onChange={e => set({ target_adherence: parseInt(e.target.value) || 0 })}
            style={{ ...sans, width: '100%', padding: '10px 12px', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: '0.9rem', color: 'hsl(var(--foreground))', outline: 'none' }}
          />
        </div>
      </div>

      {fd.ai_personalization && (
        <div style={{ padding: '14px 16px', background: 'rgba(199,91,58,0.06)', border: '1px solid rgba(199,91,58,0.2)', borderRadius: 12 }}>
          <p style={{ ...sans, fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))' }}>
            AI will use these goals to create personalised weekly challenges.
          </p>
        </div>
      )}
    </SectionPage>
  );
}

// ─── Section: Display ─────────────────────────────────────────────────────────

function DisplaySection({ formData, setFormData, onSave, saving, saved }) {
  const fd = formData;
  const set = (patch) => setFormData(prev => ({ ...prev, ...patch }));

  return (
    <SectionPage title="Display" onBack={onSave} saving={saving} saved={saved} showSave onSave={onSave}>
      <div style={card}>
        <div style={{ padding: '14px 16px' }}>
          <p style={{ ...sans, fontSize: '0.85rem', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 8 }}>Time Format</p>
          <MobileSelect
            value={fd.time_format}
            onValueChange={v => set({ time_format: v })}
            options={[
              { value: '12h', label: '12-hour (e.g. 3:00 PM)' },
              { value: '24h', label: '24-hour (e.g. 15:00)' },
            ]}
          />
        </div>

        <div style={{ ...divider, padding: '14px 16px' }}>
          <p style={{ ...sans, fontSize: '0.85rem', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 8 }}>App Theme</p>
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
          <p style={{ ...sans, fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: 6 }}>Changes apply instantly</p>
        </div>

        <Row style={divider}>
          <RowLabel label="Disable System Gestures" desc="Prevent pull-to-refresh and swipe gestures" />
          <Switch checked={fd.disable_system_gestures} onCheckedChange={v => set({ disable_system_gestures: v })} />
        </Row>
      </div>
    </SectionPage>
  );
}

// ─── Section: Security ────────────────────────────────────────────────────────

function SecuritySection({ autoLockTimeout, handleAutoLockChange, onBack }) {
  return (
    <SectionPage title="Security" onBack={onBack}>
      <div>
        <SectionLabel>Auto-Lock</SectionLabel>
        <div style={card}>
          <div style={{ padding: '14px 16px' }}>
            <MobileSelect
              value={autoLockTimeout}
              onValueChange={handleAutoLockChange}
              options={AUTO_LOCK_OPTIONS}
            />
            <p style={{ ...sans, fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: 6 }}>
              App locks and clears decrypted data after this period of inactivity
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, padding: '14px 16px', background: 'rgba(199,91,58,0.06)', border: '1px solid rgba(199,91,58,0.2)', borderRadius: 12 }}>
        <Lock style={{ width: 16, height: 16, color: 'hsl(var(--primary))', flexShrink: 0, marginTop: 2 }} />
        <div style={{ ...sans, fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.7 }}>
          <p style={{ fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 4 }}>Black Box Mode</p>
          <p>All medication data is encrypted with AES-256-GCM. The key never leaves your device.</p>
          <p>• Screenshots and screen recording are blocked</p>
          <p>• Biometric (fingerprint / Face ID) + PIN fallback</p>
          <p>• Emergency Medical ID always accessible without unlocking</p>
        </div>
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

      <div>
        <SectionLabel>Raw Data Export</SectionLabel>
        <div style={card}>
          <div style={{ padding: '16px' }}>
            <p style={{ ...sans, fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginBottom: 12 }}>
              Download all your data as a JSON file
            </p>
            <button
              onClick={handleExportData}
              style={{ ...sans, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: '0.85rem', fontWeight: 500, color: 'hsl(var(--foreground))', cursor: 'pointer' }}
            >
              <Download style={{ width: 16, height: 16 }} />
              Export All Data (JSON)
            </button>
          </div>
        </div>
      </div>

      <EnhancedDataExport user={user} />
    </SectionPage>
  );
}

// ─── Section: Account ─────────────────────────────────────────────────────────

function AccountSection({ user, onBack, handleDeleteAccount }) {
  const navigate = useNavigate();
  return (
    <SectionPage title="Account" onBack={onBack}>
      {user && (
        <div style={card}>
          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(199,91,58,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User style={{ width: 20, height: 20, color: 'hsl(var(--primary))' }} />
            </div>
            <div>
              <p style={{ ...sans, fontSize: '0.95rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>{user.full_name}</p>
              <p style={{ ...sans, fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>{user.email}</p>
              <p style={{ ...sans, fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>Role: {user.role}</p>
            </div>
          </div>
        </div>
      )}

      <div style={card}>
        <button
          onClick={() => navigate(createPageUrl('PrivacyPolicy'))}
          style={{ ...sans, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', minHeight: 52 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(199,91,58,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield style={{ width: 16, height: 16, color: 'hsl(var(--primary))' }} />
            </div>
            <span style={{ ...sans, fontSize: '0.88rem', fontWeight: 500, color: 'hsl(var(--foreground))' }}>Privacy Policy</span>
          </div>
          <ChevronRight style={{ width: 15, height: 15, color: 'hsl(var(--muted-foreground))', opacity: 0.5 }} />
        </button>
      </div>

      {/* Danger zone */}
      <div>
        <SectionLabel>Danger Zone</SectionLabel>
        <div style={{ ...card, border: '1px solid rgba(199,91,58,0.3)' }}>
          <div style={{ padding: 16 }}>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  style={{ ...sans, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: 'rgba(199,91,58,0.08)', border: '1px solid rgba(199,91,58,0.25)', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--primary))', cursor: 'pointer' }}
                >
                  <Trash2 style={{ width: 15, height: 15 }} />
                  Delete All Account Data
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes all your medications, logs, and achievements. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
                    Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p style={{ ...sans, fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))', marginTop: 10, textAlign: 'center' }}>
              All data will be deleted and you will need to restart the app.
            </p>
          </div>
        </div>
      </div>
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

  if (section === 'notifications') return <NotificationsSection formData={formData} setFormData={setFormData} onSave={handleSave} saving={updateSettingsMutation.isPending} saved={saved} />;
  if (section === 'ai')            return <AISection            formData={formData} setFormData={setFormData} onSave={handleSave} saving={updateSettingsMutation.isPending} saved={saved} />;
  if (section === 'goals')         return <GoalsSection         formData={formData} setFormData={setFormData} onSave={handleSave} saving={updateSettingsMutation.isPending} saved={saved} />;
  if (section === 'display')       return <DisplaySection       formData={formData} setFormData={setFormData} onSave={handleSave} saving={updateSettingsMutation.isPending} saved={saved} />;
  if (section === 'security')      return <SecuritySection      autoLockTimeout={autoLockTimeout} handleAutoLockChange={handleAutoLockChange} onBack={() => setSection(null)} />;
  if (section === 'health')        return <HealthDataSection    onBack={() => setSection(null)} />;
  if (section === 'backup')        return <BackupSection        user={user} onBack={() => setSection(null)} handleExportData={handleExportData} />;
  if (section === 'account')       return <AccountSection       user={user} onBack={() => setSection(null)} handleDeleteAccount={handleDeleteAccount} />;

  // ── Main menu ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--background))' }}>
        <div style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const appRows = [
    { icon: Bell,    title: 'Notifications', subtitle: 'Reminders, sounds, snooze',    key: 'notifications' },
    { icon: Shield,  title: 'Privacy & AI',  subtitle: 'Data sharing and AI features',  key: 'ai' },
    { icon: Target,  title: 'Goals',         subtitle: 'Streak and adherence targets',  key: 'goals' },
    { icon: Monitor, title: 'Display',       subtitle: 'Theme and time format',         key: 'display' },
  ];

  const dataRows = [
    { icon: Lock,    title: 'Security',        subtitle: 'PIN, biometrics, auto-lock',       key: 'security' },
    { icon: Heart,   title: 'Health Data',     subtitle: 'Integrations and exports',         key: 'health' },
    { icon: Archive, title: 'Backup & Export', subtitle: 'Encrypted backup, JSON export',    key: 'backup' },
  ];

  return (
    <div style={{ overscrollBehavior: 'none', background: 'hsl(var(--background))', minHeight: '100vh' }}>
      <RootPageHeader title="Settings" subtitle="Preferences & configuration" />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 96px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div style={{ padding: '0 0 4px' }}>
          <PrivacyNotice />
        </div>

        {/* App settings */}
        <div>
          <p style={{ ...sans, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: 10, paddingLeft: 2 }}>
            App Settings
          </p>
          <div style={{ ...card, borderRadius: 14 }}>
            {appRows.map((row, i) => (
              <div key={row.key} style={i > 0 ? divider : {}}>
                <SettingsRow icon={row.icon} title={row.title} subtitle={row.subtitle} onPress={() => setSection(row.key)} />
              </div>
            ))}
          </div>
        </div>

        {/* Data & Security */}
        <div>
          <p style={{ ...sans, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: 10, paddingLeft: 2 }}>
            Data & Security
          </p>
          <div style={{ ...card, borderRadius: 14 }}>
            {dataRows.map((row, i) => (
              <div key={row.key} style={i > 0 ? divider : {}}>
                <SettingsRow icon={row.icon} title={row.title} subtitle={row.subtitle} onPress={() => setSection(row.key)} />
              </div>
            ))}
          </div>
        </div>

        {/* Account */}
        <div>
          <p style={{ ...sans, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: 10, paddingLeft: 2 }}>
            Account
          </p>
          <div style={{ ...card, borderRadius: 14 }}>
            <SettingsRow icon={User} title="Account" subtitle={user?.email ?? 'Profile and data management'} onPress={() => setSection('account')} />
            <div style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <SettingsRow
                icon={Share2}
                title="Share with Clinic"
                subtitle={isConsentActive() ? 'Sharing active — tap to manage' : 'Share adherence data with your clinician'}
                onPress={() => navigate(createPageUrl('ClinicShare'))}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
