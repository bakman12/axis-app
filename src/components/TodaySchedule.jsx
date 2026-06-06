import React from 'react';
import { entities } from '@/lib/encryptedBase44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import LogDoseDialog from './LogDoseDialog';
import SnoozeButton from './SnoozeButton';
import { checkAndNotifyLowStock } from '@/lib/NotificationService';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useDrag } from '@use-gesture/react';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };
const mono  = { fontFamily: 'Inter, sans-serif' };

function statusBadge(status, isPast, isCritical) {
  if (status === 'taken')  return { label: 'Done',   style: { background: 'rgba(44,44,44,0.08)', color: '#2c2c2c', border: '1px solid rgba(44,44,44,0.15)' } };
  if (status === 'missed') return { label: 'Missed', style: { background: 'rgba(199,91,58,0.1)',  color: '#c75b3a', border: '1px solid rgba(199,91,58,0.25)' } };
  if (isCritical && isPast) return { label: 'Urgent', style: { background: 'rgba(199,91,58,0.12)', color: '#c75b3a', border: '1px solid rgba(199,91,58,0.3)' } };
  if (isPast)               return { label: 'Later',  style: { background: 'rgba(138,138,138,0.1)', color: '#8a8a8a', border: '1px solid rgba(138,138,138,0.2)' } };
  return                           { label: 'Soon',   style: { background: 'rgba(199,91,58,0.08)', color: '#c75b3a', border: '1px solid rgba(199,91,58,0.2)' } };
}

function accentColor(status, isPast) {
  if (status === 'taken')  return '#2c2c2c';
  if (status === 'missed') return '#c75b3a';
  if (isPast)              return '#8a8a8a';
  return '#c75b3a';
}

export default function TodaySchedule({ schedule }) {
  const [selectedMedication, setSelectedMedication] = React.useState(null);
  const [selectedTime, setSelectedTime]             = React.useState(null);
  const [swipeStates, setSwipeStates]               = React.useState({});
  const queryClient = useQueryClient();

  const logMutation = useMutation({
    mutationFn: async ({ medication, scheduledTime, status }) => {
      const takenAt = new Date();
      const [h, m] = scheduledTime.split(':');
      const scheduled = new Date();
      scheduled.setHours(+h, +m, 0, 0);
      const delay = Math.max(0, Math.floor((takenAt - scheduled) / 60000));
      return entities.MedicationLog.create({
        medication_id:   medication.id,
        medication_name: medication.name,
        scheduled_time:  scheduledTime,
        taken_time:      takenAt.toISOString(),
        status,
        delay_minutes:   delay,
      });
    },
    onMutate: async ({ medication, scheduledTime, status }) => {
      await queryClient.cancelQueries(['logs', 'today']);
      const prev = queryClient.getQueryData(['logs', 'today']);
      const [h, m] = scheduledTime.split(':');
      const scheduled = new Date(); scheduled.setHours(+h, +m, 0, 0);
      const delay = Math.max(0, Math.floor((new Date() - scheduled) / 60000));
      const optimistic = { id: `tmp-${Date.now()}`, medication_id: medication.id, medication_name: medication.name, scheduled_time: scheduledTime, taken_time: new Date().toISOString(), status, delay_minutes: delay, created_date: new Date().toISOString() };
      queryClient.setQueryData(['logs', 'today'], (old = []) => [...old, optimistic]);
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['logs', 'today'], ctx.prev);
      toast.error('Failed to log dose');
    },
    onSuccess: async (_, vars) => {
      if (vars.status === 'taken') {
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
        const med = vars.medication;
        if (med?.quantity_remaining != null) {
          const newQty = Math.max(0, med.quantity_remaining - 1);
          await entities.Medication.update(med.id, { quantity_remaining: newQty });
          await checkAndNotifyLowStock({ ...med, quantity_remaining: newQty });
          queryClient.invalidateQueries({ queryKey: ['medications'] });
        }
        toast.success('Dose logged ✓');
      } else if (vars.status === 'missed') {
        Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
        toast('Marked as missed');
      }
    },
    onSettled: () => queryClient.invalidateQueries(['logs', 'today']),
  });

  const handleLog = (item, status) =>
    logMutation.mutate({ medication: item.medication, scheduledTime: item.scheduledTime, status });

  const bind = useDrag(({ args: [item], down, movement: [mx], direction: [xDir], velocity: [vx] }) => {
    const key = `${item.medication.id}-${item.scheduledTime}`;
    if (!down) {
      if (Math.abs(mx) > 90 && Math.abs(vx) > 0.4 && !item.log) {
        Haptics.impact({ style: 'medium' }).catch(() => {});
        handleLog(item, xDir > 0 ? 'taken' : 'missed');
      }
      setSwipeStates(p => ({ ...p, [key]: 0 }));
    } else {
      setSwipeStates(p => ({ ...p, [key]: mx }));
    }
  });

  const currentTime = format(new Date(), 'HH:mm');

  if (schedule.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ ...mono, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: 12 }}>Today's Schedule</p>
        <p style={{ ...serif, fontSize: '1.4rem', color: 'hsl(var(--foreground))', opacity: 0.4 }}>No doses scheduled today</p>
      </div>
    );
  }

  return (
    <div>
      {/* Section label */}
      <p style={{ ...mono, fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: 14, paddingLeft: 2 }}>
        Today's Schedule
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {schedule.map((item) => {
          const isPast = item.scheduledTime < currentTime;
          const status = item.log?.status;
          const key    = `${item.medication.id}-${item.scheduledTime}`;
          const badge  = statusBadge(status, isPast, item.medication.critical);
          const accent = accentColor(status, isPast);
          const isDone = status === 'taken';

          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 12,
                overflow: 'hidden',
                transform: `translateX(${swipeStates[key] || 0}px)`,
                touchAction: 'pan-y',
                opacity: isDone ? 0.65 : 1,
                transition: 'opacity 0.2s',
              }}
              {...(status ? {} : bind(item))}
            >
              {/* Left accent bar */}
              <div style={{ width: 3, alignSelf: 'stretch', background: accent, flexShrink: 0 }} />

              {/* Content */}
              <div style={{ flex: 1, padding: '14px 0 14px 2px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ ...serif, fontSize: '1rem', fontWeight: 600, color: 'hsl(var(--foreground))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.medication.name}
                    </p>
                    <p style={{ ...mono, fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>
                      {item.scheduledTime}
                      {item.medication.dosage ? ` · ${item.medication.dosage}` : ''}
                    </p>
                  </div>

                  {/* Badge / actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingRight: 14 }}>
                    {status ? (
                      <span style={{ ...mono, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 100, ...badge.style }}>
                        {badge.label}
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => { setSelectedMedication(item.medication); setSelectedTime(item.scheduledTime); }}
                          style={{ ...mono, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 100, background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', border: 'none', cursor: 'pointer', minHeight: 36 }}
                        >
                          Log
                        </button>
                        <button
                          onClick={() => handleLog(item, 'missed')}
                          style={{ ...mono, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 10px', borderRadius: 100, background: 'transparent', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))', cursor: 'pointer', minHeight: 36 }}
                        >
                          Miss
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <LogDoseDialog
        open={!!selectedMedication}
        onClose={() => { setSelectedMedication(null); setSelectedTime(null); }}
        medication={selectedMedication}
        scheduledTime={selectedTime}
      />
    </div>
  );
}
