import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, ArrowRight } from 'lucide-react';

// Convert "HH:MM" + offset hours → { time: "HH:MM", nextDay, prevDay }
function adjustTime(timeStr, offsetHours) {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m + Math.round(offsetHours * 60);
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const newH = Math.floor(wrapped / 60);
  const newM = wrapped % 60;
  return {
    time: `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`,
    nextDay: totalMinutes >= 1440,
    prevDay: totalMinutes < 0,
  };
}

// Format offset as "+5h", "-3.5h", etc.
function formatOffset(offset) {
  const sign = offset >= 0 ? '+' : '';
  return `${sign}${offset % 1 === 0 ? offset : offset.toFixed(1)}h`;
}

export default function ActiveTripSchedule({ trip, medications }) {
  if (!trip || !medications?.length) return null;

  const offset = trip.timezone_offset ?? 0;
  const direction = offset > 0 ? 'ahead' : offset < 0 ? 'behind' : null;

  return (
    <Card className="border-l-4 border-l-emerald-500 dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base dark:text-white">
          <Clock className="w-4 h-4 text-emerald-500" />
          Active Trip — Adjusted Schedule
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <MapPin className="w-3 h-3" />
          <span>{trip.destination}</span>
          {offset !== 0 && (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs">
              {formatOffset(offset)} from London ({direction})
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {offset === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No timezone change — your schedule stays the same.
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your home times (London) → local times in {trip.destination}
            </p>

            {medications.map(med => {
              const adjustedTimes = (med.times ?? []).map(t => ({
                home: t,
                ...adjustTime(t, offset),
              }));

              return (
                <div key={med.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm dark:text-white">{med.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{med.dosage}</span>
                  </div>
                  <div className="space-y-1">
                    {adjustedTimes.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400 font-mono w-12">{t.home}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="font-semibold dark:text-white font-mono">{t.time}</span>
                        {t.nextDay && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">(+1 day)</span>
                        )}
                        {t.prevDay && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">(prev day)</span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                          {trip.destination} local
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded p-2">
              For critical medications, consult your pharmacist about adjusting timing gradually across time zones.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
