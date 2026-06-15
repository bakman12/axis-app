import { useQuery } from '@tanstack/react-query';
import { entities } from '@/lib/encryptedBase44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Returns 'perfect' | 'partial' | 'missed' | 'none' for a given day's logs
function dayStatus(logs) {
  if (!logs?.length) return 'none';
  const taken  = logs.filter(l => l.status === 'taken' || l.status === 'partial').length;
  const missed = logs.filter(l => l.status === 'missed').length;
  if (missed === 0) return 'perfect';
  if (taken  === 0) return 'missed';
  return 'partial';
}

const STATUS_CLASSES = {
  perfect: 'bg-green-500',
  partial: 'bg-amber-400',
  missed:  'bg-red-500',
  none:    'bg-gray-200 dark:bg-gray-700',
};

const STATUS_LABEL = {
  perfect: 'All taken',
  partial: 'Partial',
  missed:  'Missed',
  none:    'No doses',
};

export default function DoseHistoryCalendar() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['logs', 'history30'],
    queryFn: async () => {
      const all = await /** @type {any} */ (entities).MedicationLog.list();
      const cutoff = subDays(new Date(), 30);
      return all.filter(log => {
        const t = new Date(log.taken_time || log.created_date);
        return t >= cutoff;
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  // Group logs by date string (YYYY-MM-DD)
  const byDate = {};
  for (const log of logs) {
    const d = (log.taken_time || log.created_date || '').split('T')[0];
    if (d) {
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(log);
    }
  }

  // Build last-30-days array (oldest → today)
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(today, 29 - i);
    return format(d, 'yyyy-MM-dd');
  });

  // Stats
  const statDays = days.filter(d => d < format(today, 'yyyy-MM-dd') || byDate[d]?.length);
  const perfect  = statDays.filter(d => dayStatus(byDate[d]) === 'perfect').length;
  const pct      = statDays.length ? Math.round((perfect / statDays.length) * 100) : null;

  return (
    <Card className="shadow-md dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 dark:text-white text-base">
          <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          30-Day Adherence
          {pct !== null && (
            <span className={`text-sm font-bold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
              {pct}%
            </span>
          )}
          <Link
            to={createPageUrl('History')}
            className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline font-normal"
          >
            View all
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
        ) : (
          <>
            {/* Calendar grid — 6 columns × 5 rows */}
            <div className="grid grid-cols-10 gap-1">
              {days.map(date => {
                const status = dayStatus(byDate[date]);
                const isFuture = date > format(today, 'yyyy-MM-dd');
                return (
                  <div
                    key={date}
                    title={`${format(parseISO(date), 'MMM d')} — ${STATUS_LABEL[status]}`}
                    className={`h-5 w-full rounded-sm ${isFuture ? 'opacity-0' : STATUS_CLASSES[status]}`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
              {[['perfect','All taken'],['partial','Partial'],['missed','Missed'],['none','No data']].map(([s, label]) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-sm ${STATUS_CLASSES[s]}`} />
                  {label}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
