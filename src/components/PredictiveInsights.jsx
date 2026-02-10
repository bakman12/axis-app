import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, AlertTriangle, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function PredictiveInsights({ medications }) {
  const [analyzing, setAnalyzing] = useState(false);

  const { data: logs = [] } = useQuery({
    queryKey: ['logs'],
    queryFn: () => base44.entities.MedicationLog.list('-created_date', 100)
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkins'],
    queryFn: () => base44.entities.CheckIn.list('-created_date', 30)
  });

  const { data: predictions, isLoading, refetch } = useQuery({
    queryKey: ['predictions'],
    queryFn: async () => {
      setAnalyzing(true);
      try {
        // Analyze patterns with AI
        const recentLogs = logs.slice(0, 50);
        const recentCheckIns = checkIns.slice(0, 14);
        
        const prompt = `You are analyzing medication adherence behavioral patterns to provide reminder support.

Historical Data:
- Medication Logs (last 50): ${JSON.stringify(recentLogs.map(l => ({
  medication: l.medication_name,
  scheduled: l.scheduled_time,
  status: l.status,
  delay_minutes: l.delay_minutes,
  context: l.context,
  date: format(new Date(l.created_date), 'yyyy-MM-dd')
})))}

- Daily Check-ins (last 14 days): ${JSON.stringify(recentCheckIns.map(c => ({
  date: c.date,
  context: c.context,
  routine_disrupted: c.routine_disrupted,
  location_changed: c.location_changed
})))}

- Current medications: ${JSON.stringify(medications.map(m => ({
  name: m.name,
  times: m.times,
  critical: m.critical
})))}

CRITICAL SAFETY RULES:
- This is a BEHAVIORAL REMINDER TOOL ONLY - not medical advice
- You analyze ADHERENCE PATTERNS, not health conditions or medical needs
- NEVER suggest starting, stopping, or changing medications
- NEVER interpret symptoms or medical conditions
- NEVER make predictions about health outcomes or medical risks
- Focus ONLY on behavioral patterns (time of day, day of week, context like "traveling")
- If you identify concerning adherence patterns, suggest "discussing this pattern with your healthcare provider" - nothing more specific

Your role: Identify when the user is most likely to forget based on PAST BEHAVIOR, and suggest practical reminders like "Set an alarm for mornings" or "Check medication before leaving for work."

Analyze behavioral patterns and provide adherence reminders only.`;

        const response = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              risk_level: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "Overall risk level for today"
              },
              high_risk_times: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    time: { type: "string" },
                    medication: { type: "string" },
                    reason: { type: "string" },
                    confidence: { type: "string", enum: ["low", "medium", "high"] }
                  }
                }
              },
              patterns_identified: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    pattern: { type: "string" },
                    impact: { type: "string" }
                  }
                }
              },
              recommendations: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        });

        return response;
      } finally {
        setAnalyzing(false);
      }
    },
    enabled: logs.length > 5 && medications.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false
  });

  if (logs.length < 5) {
    return (
      <Card className="shadow-md border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            AI Predictive Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">
              AI predictions will appear after you log a few medications
            </p>
            <p className="text-sm text-gray-500 mt-2">
              The more data you provide, the better the predictions
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const riskColors = {
    low: 'bg-green-100 text-green-800 border-green-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    high: 'bg-red-100 text-red-800 border-red-300'
  };

  return (
    <Card className="shadow-md border-l-4 border-l-purple-500">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            AI Predictive Insights
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Behavioral reminders based on your patterns
          </p>
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
        {(isLoading || analyzing) ? (
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded animate-pulse" />
            <div className="h-32 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : predictions ? (
          <div className="space-y-6">
            {/* Risk Level */}
            <div>
              <Label className="text-sm text-gray-600 mb-2 block">Today's Risk Level</Label>
              <Badge className={`${riskColors[predictions.risk_level]} border px-4 py-2 text-base`}>
                {predictions.risk_level.toUpperCase()} RISK
              </Badge>
            </div>

            {/* High Risk Times */}
            {predictions.high_risk_times?.length > 0 && (
              <div>
                <Label className="text-sm text-gray-600 mb-3 block flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Watch Out For These Times
                </Label>
                <div className="space-y-2">
                  {predictions.high_risk_times.map((risk, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-orange-50 border border-orange-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-orange-600" />
                            <span className="font-semibold text-gray-900">{risk.time}</span>
                            <span className="text-gray-600">- {risk.medication}</span>
                          </div>
                          <p className="text-sm text-gray-700">{risk.reason}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            risk.confidence === 'high'
                              ? 'bg-red-50 text-red-700 border-red-300'
                              : risk.confidence === 'medium'
                              ? 'bg-orange-50 text-orange-700 border-orange-300'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-300'
                          }
                        >
                          {risk.confidence}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patterns */}
            {predictions.patterns_identified?.length > 0 && (
              <div>
                <Label className="text-sm text-gray-600 mb-3 block flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Patterns We've Noticed
                </Label>
                <div className="space-y-2">
                  {predictions.patterns_identified.map((pattern, idx) => (
                    <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="font-medium text-gray-900 text-sm">{pattern.pattern}</p>
                      <p className="text-xs text-gray-600 mt-1">{pattern.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {predictions.recommendations?.length > 0 && (
              <div>
                <Label className="text-sm text-gray-600 mb-3 block">Adherence Suggestions</Label>
                <ul className="space-y-2">
                  {predictions.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-purple-500 mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-gray-700">
                <strong>⚠️ Not Medical Advice:</strong> This analyzes your behavioral patterns to help with reminders. 
                It does not provide medical advice or assess your health. For any medical concerns or questions about your medications, 
                always consult your GP or healthcare provider.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p>Unable to generate predictions. Try refreshing.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Label({ children, className = '' }) {
  return <label className={`font-semibold text-gray-700 ${className}`}>{children}</label>;
}