import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { entities } from '@/lib/encryptedBase44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertCircle, Trash2, Sparkles } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function EventCard({ event }) {
  const queryClient = useQueryClient();
  const [aiTip, setAiTip] = useState(null);
  const [loadingTip, setLoadingTip] = useState(false);

  const deleteEventMutation = useMutation({
    mutationFn: (id) => entities.ImportantEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted');
    }
  });

  const eventTypeColors = {
    meeting: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    presentation: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    flight: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    exam: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    wedding: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    interview: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    sports: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  };

  const getSmartTip = async () => {
    setLoadingTip(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Given this event: "${event.title}" (${event.event_type}) on ${event.date} at ${event.time || 'unspecified time'}, provide a brief, practical ADHERENCE REMINDER tip (1-2 sentences).

STRICT SAFETY RULES:
- Provide REMINDER STRATEGIES ONLY - not medical advice
- Focus ONLY on timing and routine (e.g., "Set a phone alarm 2 hours before" or "Take medication with breakfast before leaving")
- NEVER suggest dosage changes, skipping doses, or taking extra doses
- NEVER provide medical advice about the medications themselves
- If the event might conflict with medication timing, suggest: "Speak with your pharmacist about adjusting your schedule for this day"

Focus on practical, non-medical adherence tips to help them not forget during this important event.`,
      });
      setAiTip(result);
    } catch (error) {
      toast.error('Failed to get AI tip');
    } finally {
      setLoadingTip(false);
    }
  };

  const daysUntil = differenceInDays(new Date(event.date), new Date());
  const isToday = daysUntil === 0;
  const isPast = daysUntil < 0;

  // Calculate reminder timing
  let reminderText = '';
  if (event.time) {
    const eventDateTime = parseISO(`${event.date}T${event.time}`);
    const reminderDateTime = new Date(eventDateTime.getTime() - event.reminder_hours_before * 60 * 60 * 1000);
    reminderText = `Remind ${format(reminderDateTime, 'h:mm a')}`;
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 border-l-4 border-l-purple-500">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold dark:text-white mb-1">{event.title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={eventTypeColors[event.event_type]}>
                {event.event_type}
              </Badge>
              {isToday && (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  Today!
                </Badge>
              )}
              {!isPast && daysUntil > 0 && daysUntil <= 3 && (
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  In {daysUntil} day{daysUntil > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteEventMutation.mutate(event.id)}
            className="text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(event.date), 'EEEE, MMMM d, yyyy')}</span>
          </div>
          {event.time && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{event.time}</span>
            </div>
          )}
        </div>

        {/* Smart Reminder Info */}
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-purple-200 dark:border-purple-700 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="font-medium text-sm dark:text-white">Smart Reminder</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {reminderText || `${event.reminder_hours_before} hours before event`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Don't let this important moment be affected by missed medication
          </p>
        </div>

        {/* AI Tip */}
        {!aiTip && !loadingTip && (
          <Button
            variant="outline"
            size="sm"
            onClick={getSmartTip}
            className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get AI Medication Tip
          </Button>
        )}

        {loadingTip && (
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Generating tip...</span>
            </div>
          </div>
        )}

        {aiTip && (
          <div className="space-y-2">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-300">{aiTip}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ⚠️ This is a reminder strategy only, not medical advice
            </p>
          </div>
        )}

        {event.notes && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 italic">
            {event.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}