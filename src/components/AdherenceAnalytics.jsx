import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { format, startOfWeek, subDays, eachDayOfInterval } from 'date-fns';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function AdherenceAnalytics({ medications, logs, checkIns }) {
  const [analyzing, setAnalyzing] = useState(false);

  const { data: correlations, isLoading, refetch } = useQuery({
    queryKey: ['correlations'],
    queryFn: async () => {
      setAnalyzing(true);
      try {
        const prompt = `Analyze medication adherence patterns and identify correlations.

Medication Logs: ${JSON.stringify(logs.slice(0, 100).map(l => ({
  medication: l.medication_name,
  status: l.status,
  delay: l.delay_minutes,
  context: l.context,
  time: l.scheduled_time,
  date: format(new Date(l.created_date), 'yyyy-MM-dd')
})))}

Daily Check-ins: ${JSON.stringify(checkIns.map(c => ({
  date: c.date,
  context: c.context,
  routine_disrupted: c.routine_disrupted,
  location_changed: c.location_changed
})))}

Identify:
1. Which contexts correlate with missed doses (e.g., traveling, poor sleep, busy days)
2. Which times of day have highest miss rates
3. Patterns by day of week
4. Impact of routine disruptions
5. Medication-specific adherence patterns

Provide statistical correlations with confidence levels.`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              context_correlations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    context: { type: "string" },
                    miss_rate: { type: "number" },
                    confidence: { type: "string" },
                    insight: { type: "string" }
                  }
                }
              },
              time_patterns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    time_range: { type: "string" },
                    adherence_rate: { type: "number" },
                    description: { type: "string" }
                  }
                }
              },
              medication_adherence: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    medication: { type: "string" },
                    adherence_rate: { type: "number" },
                    trend: { type: "string" }
                  }
                }
              },
              key_findings: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        });

        return result;
      } finally {
        setAnalyzing(false);
      }
    },
    enabled: logs.length > 10,
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false
  });

  // Calculate adherence over time
  const calculateDailyAdherence = () => {
    const last14Days = eachDayOfInterval({
      start: subDays(new Date(), 13),
      end: new Date()
    });

    return last14Days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayLogs = logs.filter(l => 
        format(new Date(l.created_date), 'yyyy-MM-dd') === dateStr
      );
      
      const taken = dayLogs.filter(l => l.status === 'taken').length;
      const total = dayLogs.length;
      
      return {
        date: format(day, 'MMM dd'),
        adherence: total > 0 ? Math.round((taken / total) * 100) : 0,
        taken,
        total
      };
    });
  };

  // Calculate status distribution
  const calculateStatusDistribution = () => {
    const statusCount = logs.reduce((acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {});

    return [
      { name: 'Taken', value: statusCount.taken || 0, color: '#10b981' },
      { name: 'Missed', value: statusCount.missed || 0, color: '#ef4444' },
      { name: 'Delayed', value: statusCount.delayed || 0, color: '#f59e0b' }
    ];
  };

  // Calculate adherence by time of day
  const calculateTimeOfDayAdherence = () => {
    const timeSlots = {
      'Morning (6-12)': { taken: 0, total: 0 },
      'Afternoon (12-18)': { taken: 0, total: 0 },
      'Evening (18-24)': { taken: 0, total: 0 },
      'Night (0-6)': { taken: 0, total: 0 }
    };

    logs.forEach(log => {
      const hour = parseInt(log.scheduled_time?.split(':')[0] || 12);
      let slot;
      if (hour >= 6 && hour < 12) slot = 'Morning (6-12)';
      else if (hour >= 12 && hour < 18) slot = 'Afternoon (12-18)';
      else if (hour >= 18 && hour < 24) slot = 'Evening (18-24)';
      else slot = 'Night (0-6)';

      timeSlots[slot].total++;
      if (log.status === 'taken') timeSlots[slot].taken++;
    });

    return Object.entries(timeSlots).map(([time, data]) => ({
      time,
      rate: data.total > 0 ? Math.round((data.taken / data.total) * 100) : 0
    }));
  };

  if (logs.length < 10) {
    return (
      <Card className="shadow-md border-l-4 border-l-cyan-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-500" />
            Adherence Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Analytics will appear after logging more medications</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-l-4 border-l-cyan-500">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-500" />
            Adherence Analytics
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">Patterns and correlations in your medication adherence</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={analyzing || isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${(analyzing || isLoading) ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="correlations">Correlations</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6 mt-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">14-Day Adherence Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={calculateDailyAdherence()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="adherence" stroke="#3b82f6" strokeWidth={2} name="Adherence %" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Overall Status Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={calculateStatusDistribution()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {calculateStatusDistribution().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6 mt-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Adherence by Time of Day</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={calculateTimeOfDayAdherence()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="rate" fill="#8b5cf6" name="Adherence Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {correlations?.medication_adherence && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Medication-Specific Adherence</h3>
                <div className="space-y-2">
                  {correlations.medication_adherence.map((med, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{med.medication}</p>
                        <p className="text-sm text-gray-600">{med.adherence_rate}% adherence</p>
                      </div>
                      {med.trend === 'improving' ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : med.trend === 'declining' ? (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="correlations" className="space-y-6 mt-6">
            {(isLoading || analyzing) ? (
              <div className="space-y-3">
                <div className="h-24 bg-gray-100 rounded animate-pulse" />
                <div className="h-24 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : correlations ? (
              <>
                {correlations.context_correlations && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Context Impact on Adherence</h3>
                    <div className="space-y-3">
                      {correlations.context_correlations.map((ctx, idx) => (
                        <div key={idx} className="p-4 bg-gradient-to-r from-orange-50 to-white border border-orange-200 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900">{ctx.context}</p>
                              <p className="text-sm text-orange-600 font-medium">{ctx.miss_rate}% miss rate</p>
                            </div>
                            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
                              {ctx.confidence} confidence
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{ctx.insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {correlations.key_findings && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Key Findings</h3>
                    <ul className="space-y-2">
                      {correlations.key_findings.map((finding, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-cyan-500 mt-0.5">▸</span>
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-gray-500 py-6">Unable to generate correlations</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}