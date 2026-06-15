import { useState, useMemo } from 'react';
import { entities } from '@/lib/encryptedBase44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MobileSelect } from '@/components/ui/mobile-select';
import { CheckCircle, XCircle, SkipForward, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';
import RootPageHeader from '../components/RootPageHeader';
import PullToRefresh from '../components/PullToRefresh';

const STATUS_CONFIG = {
  taken:   { label: 'Taken',   icon: CheckCircle,  color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-900/20' },
  missed:  { label: 'Missed',  icon: XCircle,      color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20' },
  skipped: { label: 'Skipped', icon: SkipForward,  color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
};

export default function History() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatus] = useState('all');

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['logs', 'all'] });
  };

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['logs', 'all'],
    queryFn: () => /** @type {any} */ (entities).MedicationLog.list(),
    staleTime: 2 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter(log => {
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;
      if (q && !log.medication_name?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [logs, search, statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const log of filtered) {
      const dateStr = (log.taken_time || log.created_date || '').slice(0, 10);
      if (!dateStr) continue;
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr).push(log);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ overscrollBehavior: 'none' }}>
      <RootPageHeader title="Dose History" subtitle="Complete log of every dose event" />
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-2xl mx-auto p-4 pb-24 space-y-4" style={{ overscrollBehavior: 'none' }}>

          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search medication…"
                className="pl-9 h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <MobileSelect
              value={statusFilter}
              onValueChange={setStatus}
              options={[
                { value: 'all',     label: 'All' },
                { value: 'taken',   label: 'Taken' },
                { value: 'missed',  label: 'Missed' },
                { value: 'skipped', label: 'Skipped' },
              ]}
            />
          </div>

          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && grouped.length === 0 && (
            <Card className="bg-white/80 dark:bg-gray-900/50">
              <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
                No dose events found.
              </CardContent>
            </Card>
          )}

          {grouped.map(([dateStr, dayLogs]) => (
            <div key={dateStr}>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-1">
                {dateStr === todayStr
                  ? 'Today'
                  : format(new Date(dateStr + 'T12:00:00'), 'd MMMM yyyy')}
              </p>
              <Card className="bg-white/80 dark:bg-gray-900/50 backdrop-blur border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
                  {dayLogs.map(log => {
                    const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.taken;
                    const Icon = cfg.icon;
                    return (
                      <div key={log.id} className="flex items-center gap-3 p-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm dark:text-white truncate">{log.medication_name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                            {log.scheduled_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {log.scheduled_time}
                              </span>
                            )}
                            {log.taken_time && (
                              <span>at {format(new Date(log.taken_time), 'HH:mm')}</span>
                            )}
                            {log.delay_minutes > 0 && (
                              <span className="text-orange-500">{log.delay_minutes}m late</span>
                            )}
                          </div>
                          {log.context && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{log.context}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-xs flex-shrink-0 ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </PullToRefresh>
    </div>
  );
}
