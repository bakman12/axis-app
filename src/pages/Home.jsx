import { entities } from '@/lib/encryptedBase44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMissedDoseChecker } from '@/lib/useMissedDoseChecker';
import { format, startOfDay, endOfDay } from 'date-fns';
import TodaySchedule from '../components/TodaySchedule';
import PullToRefresh from '../components/PullToRefresh';
import SmartRefillTracker from '../components/SmartRefillTracker';
import DoseHistoryCalendar from '../components/DoseHistoryCalendar';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };
const sans  = { fontFamily: 'Inter, sans-serif' };

export default function Home() {
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries(['medications']);
    await queryClient.invalidateQueries(['logs']);
  };

  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: () => entities.Medication.filter({ active: true }),
  });

  const { data: todayLogs = [] } = useQuery({
    queryKey: ['logs', 'today'],
    queryFn: async () => {
      const start = startOfDay(new Date());
      const end   = endOfDay(new Date());
      const logs  = await entities.MedicationLog.list('-created_date', 500);
      return logs.filter(log => {
        const t = new Date(log.taken_time || log.created_date);
        return t >= start && t <= end;
      });
    },
  });

  const todaySchedule = medications
    .flatMap(med =>
      (med.times || []).map(time => ({
        medication: med,
        scheduledTime: time,
        log: todayLogs.find(l => l.medication_id === med.id && l.scheduled_time === time),
      }))
    )
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const takenCount   = todaySchedule.filter(i => i.log?.status === 'taken').length;
  const pendingCount = todaySchedule.filter(i => !i.log).length;

  // streak — consecutive days with 100% adherence (simplified: days where all logs are taken)
  const streak = 0; // placeholder — real streak would need history query

  useMissedDoseChecker(medications, todayLogs, queryClient);

  return (
    <div style={{ overscrollBehavior: 'none', minHeight: '100vh', background: 'hsl(var(--background))' }}>

      {/* ── Header ── */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'hsl(var(--background) / 0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid hsl(var(--border))',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
          <h1 style={{ ...serif, fontSize: '1.6rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'hsl(var(--foreground))' }}>
            Axis
          </h1>
          <p style={{ ...sans, fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.04em' }}>
            {format(new Date(), 'EEE, d MMM')}
          </p>
        </div>
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 96px', overscrollBehavior: 'none' }}>

          {/* ── Stat cards — exactly like website mockup ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 32 }}>
            {[
              { value: takenCount,   label: 'Taken',   highlight: false },
              { value: pendingCount, label: 'Pending', highlight: false },
              { value: `${streak}d`, label: 'Streak',  highlight: true  },
            ].map(({ value, label, highlight }) => (
              <div
                key={label}
                style={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 14,
                  padding: '16px 8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <p style={{ ...serif, fontSize: '2rem', fontWeight: 600, lineHeight: 1, color: highlight ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}>
                  {value}
                </p>
                <p style={{ ...sans, fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginTop: 6 }}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* ── Today's schedule ── */}
          <TodaySchedule schedule={todaySchedule} />

          {/* ── 30-day adherence heatmap ── */}
          <div style={{ marginTop: 36 }}>
            <p style={{ ...sans, fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: 14 }}>
              Monthly Adherence
            </p>
            <DoseHistoryCalendar />
          </div>

          {/* ── Refill warnings ── */}
          <div style={{ marginTop: 28 }}>
            <SmartRefillTracker />
          </div>

        </div>
      </PullToRefresh>
    </div>
  );
}
