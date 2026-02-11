import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, Clock, Calendar, Lightbulb } from 'lucide-react';
import { format, startOfWeek, eachDayOfInterval, endOfWeek } from 'date-fns';
import PremiumBadge from './PremiumBadge';

export default function AdvancedInsights({ logs, medications }) {
  // Adherence by time of day
  const timeOfDayStats = logs.reduce((acc, log) => {
    const hour = parseInt(log.scheduled_time?.split(':')[0] || '0');
    const timeSlot = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
    
    if (!acc[timeSlot]) acc[timeSlot] = { taken: 0, total: 0 };
    acc[timeSlot].total++;
    if (log.status === 'taken') acc[timeSlot].taken++;
    
    return acc;
  }, {});

  // Adherence by day of week
  const dayOfWeekStats = logs.reduce((acc, log) => {
    const day = format(new Date(log.created_date), 'EEEE');
    
    if (!acc[day]) acc[day] = { taken: 0, total: 0 };
    acc[day].total++;
    if (log.status === 'taken') acc[day].taken++;
    
    return acc;
  }, {});

  // Delay patterns
  const delayStats = logs
    .filter(l => l.delay_minutes > 0)
    .reduce((acc, log) => {
      const delay = log.delay_minutes;
      if (delay < 15) acc['<15 min']++;
      else if (delay < 30) acc['15-30 min']++;
      else if (delay < 60) acc['30-60 min']++;
      else acc['>1 hour']++;
      return acc;
    }, { '<15 min': 0, '15-30 min': 0, '30-60 min': 0, '>1 hour': 0 });

  // Context analysis
  const contextCounts = logs
    .filter(l => l.context)
    .reduce((acc, log) => {
      acc[log.context] = (acc[log.context] || 0) + 1;
      return acc;
    }, {});

  const topContexts = Object.entries(contextCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  // Medication-specific insights
  const medicationStats = medications.map(med => {
    const medLogs = logs.filter(l => l.medication_id === med.id);
    const taken = medLogs.filter(l => l.status === 'taken').length;
    const adherence = medLogs.length > 0 ? Math.round((taken / medLogs.length) * 100) : 0;
    
    return { name: med.name, adherence, total: medLogs.length };
  }).sort((a, b) => a.adherence - b.adherence);

  return (
    <div className="space-y-4">
      {/* Time of Day Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Time of Day Analysis
            </span>
            <PremiumBadge tier="pro" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(timeOfDayStats).map(([time, stats]) => {
              const rate = stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 0;
              return (
                <div key={time} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{time}</p>
                  <p className="text-2xl font-bold">{rate}%</p>
                  <p className="text-xs text-gray-500">{stats.taken}/{stats.total}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day of Week Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              Weekly Patterns
            </span>
            <PremiumBadge tier="pro" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
              const stats = dayOfWeekStats[day] || { taken: 0, total: 0 };
              const rate = stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 0;
              
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-sm w-24 text-gray-600 dark:text-gray-400">{day}</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{rate}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Delay Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Delay Patterns
            </span>
            <PremiumBadge tier="pro" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(delayStats).map(([range, count]) => (
              <div key={range} className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{count}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{range}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Context Insights */}
      {topContexts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Common Disruptions
              </span>
              <PremiumBadge tier="pro" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topContexts.map(([context, count]) => (
                <div key={context} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="text-sm capitalize">{context.replace(/_/g, ' ')}</span>
                  <Badge variant="outline">{count} times</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medication-Specific Adherence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Medication Performance
            </span>
            <PremiumBadge tier="pro" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {medicationStats.map(med => (
              <div key={med.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{med.name}</span>
                  <span className={`text-sm font-bold ${
                    med.adherence >= 90 ? 'text-green-600' : 
                    med.adherence >= 70 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {med.adherence}%
                  </span>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      med.adherence >= 90 ? 'bg-green-500' : 
                      med.adherence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${med.adherence}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}