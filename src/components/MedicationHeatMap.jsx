import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

export default function MedicationHeatMap({ logs }) {
  // Get last 12 weeks of data
  const weeks = 12;
  const today = startOfDay(new Date());
  const days = Array.from({ length: weeks * 7 }, (_, i) => subDays(today, (weeks * 7 - 1) - i));

  const getDayData = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayLogs = logs.filter(l => 
      format(new Date(l.created_date), 'yyyy-MM-dd') === dayStr
    );
    
    const taken = dayLogs.filter(l => l.status === 'taken').length;
    const partial = dayLogs.filter(l => l.status === 'partial').length;
    const total = dayLogs.length;
    
    const adherenceRate = total > 0 ? ((taken + partial * 0.5) / total) * 100 : null;
    
    return { adherenceRate, total };
  };

  const getHeatColor = (adherenceRate) => {
    if (adherenceRate === null) return 'bg-gray-100';
    if (adherenceRate === 100) return 'bg-green-600';
    if (adherenceRate >= 90) return 'bg-green-500';
    if (adherenceRate >= 75) return 'bg-green-400';
    if (adherenceRate >= 50) return 'bg-yellow-400';
    if (adherenceRate >= 25) return 'bg-orange-400';
    return 'bg-red-400';
  };

  // Group days into weeks
  const weekGroups = [];
  for (let i = 0; i < days.length; i += 7) {
    weekGroups.push(days.slice(i, i + 7));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-600" />
          Adherence Heat Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center gap-2 mb-4 text-xs flex-wrap">
          <span className="text-gray-600">Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-100 rounded" />
            <div className="w-3 h-3 bg-red-400 rounded" />
            <div className="w-3 h-3 bg-orange-400 rounded" />
            <div className="w-3 h-3 bg-yellow-400 rounded" />
            <div className="w-3 h-3 bg-green-400 rounded" />
            <div className="w-3 h-3 bg-green-500 rounded" />
            <div className="w-3 h-3 bg-green-600 rounded" />
          </div>
          <span className="text-gray-600">More</span>
        </div>

        {/* Heat Map Grid */}
        <div className="space-y-1 overflow-x-auto">
          {/* Day labels */}
          <div className="flex gap-1 ml-8">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div key={idx} className="w-3 text-[10px] text-gray-500 text-center">
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weekGroups.map((week, weekIdx) => (
            <div key={weekIdx} className="flex gap-1 items-center">
              <span className="text-[10px] text-gray-500 w-7">
                {weekIdx === 0 || weekIdx === weekGroups.length - 1 
                  ? format(week[0], 'MMM') 
                  : ''}
              </span>
              {week.map((day, dayIdx) => {
                const data = getDayData(day);
                return (
                  <div
                    key={dayIdx}
                    className={`w-3 h-3 rounded-sm ${getHeatColor(data.adherenceRate)} transition-all cursor-pointer hover:ring-2 hover:ring-blue-500`}
                    title={`${format(day, 'MMM d, yyyy')}: ${
                      data.adherenceRate !== null 
                        ? `${Math.round(data.adherenceRate)}% adherence`
                        : 'No data'
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="p-2 bg-green-50 rounded-lg">
            <p className="text-lg font-bold text-green-700">
              {logs.filter(l => l.status === 'taken').length}
            </p>
            <p className="text-xs text-gray-600">Full Doses</p>
          </div>
          <div className="p-2 bg-yellow-50 rounded-lg">
            <p className="text-lg font-bold text-yellow-700">
              {logs.filter(l => l.status === 'partial').length}
            </p>
            <p className="text-xs text-gray-600">Partial Doses</p>
          </div>
          <div className="p-2 bg-red-50 rounded-lg">
            <p className="text-lg font-bold text-red-700">
              {logs.filter(l => l.status === 'missed').length}
            </p>
            <p className="text-xs text-gray-600">Missed</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}