import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';

export default function MedicationCalendar({ logs }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get day of week for the first day to properly align calendar
  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const getDayStats = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayLogs = logs.filter(l => 
      format(new Date(l.created_date), 'yyyy-MM-dd') === dayStr
    );
    
    const taken = dayLogs.filter(l => l.status === 'taken').length;
    const partial = dayLogs.filter(l => l.status === 'partial').length;
    const missed = dayLogs.filter(l => l.status === 'missed').length;
    const total = dayLogs.length;
    
    const adherenceRate = total > 0 ? ((taken + partial * 0.5) / total) * 100 : 0;
    
    return { taken, partial, missed, total, adherenceRate };
  };

  const getDayColor = (adherenceRate) => {
    if (adherenceRate === 100) return 'bg-green-500 text-white';
    if (adherenceRate >= 80) return 'bg-blue-500 text-white';
    if (adherenceRate >= 50) return 'bg-yellow-400 text-gray-900';
    if (adherenceRate > 0) return 'bg-orange-400 text-white';
    return 'bg-red-400 text-white';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Calendar View
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[120px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          <Badge className="bg-green-500">100%</Badge>
          <Badge className="bg-blue-500">80-99%</Badge>
          <Badge className="bg-yellow-400 text-gray-900">50-79%</Badge>
          <Badge className="bg-orange-400">1-49%</Badge>
          <Badge className="bg-red-400">Missed</Badge>
          <Badge variant="outline">No data</Badge>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 p-2">
              {day}
            </div>
          ))}

          {/* Empty cells for alignment */}
          {emptyDays.map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square" />
          ))}

          {/* Calendar days */}
          {daysInMonth.map((day) => {
            const stats = getDayStats(day);
            const isToday = isSameDay(day, new Date());
            const hasData = stats.total > 0;

            return (
              <div
                key={day.toISOString()}
                className={`aspect-square p-1 rounded-lg transition-all ${
                  !isSameMonth(day, currentMonth) ? 'opacity-50' : ''
                } ${isToday ? 'ring-2 ring-blue-600' : ''}`}
              >
                <div
                  className={`w-full h-full rounded-md flex flex-col items-center justify-center text-xs ${
                    hasData ? getDayColor(stats.adherenceRate) : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <div className="font-semibold">{format(day, 'd')}</div>
                  {hasData && (
                    <div className="text-[10px] opacity-90">
                      {stats.taken}/{stats.total}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Summary */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
          <p className="text-gray-600">
            <strong>This Month:</strong> {
              logs.filter(l => 
                isSameMonth(new Date(l.created_date), currentMonth)
              ).filter(l => l.status === 'taken').length
            } doses taken
          </p>
        </div>
      </CardContent>
    </Card>
  );
}