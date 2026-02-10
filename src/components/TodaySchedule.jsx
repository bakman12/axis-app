import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function TodaySchedule({ schedule }) {
  const [contextNotes, setContextNotes] = React.useState({});
  const queryClient = useQueryClient();

  const logMedicationMutation = useMutation({
    mutationFn: async ({ medication, scheduledTime, status, context }) => {
      const now = new Date();
      const [hours, minutes] = scheduledTime.split(':');
      const scheduledDate = new Date();
      scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const delayMinutes = Math.floor((now - scheduledDate) / 60000);

      return base44.entities.MedicationLog.create({
        medication_id: medication.id,
        medication_name: medication.name,
        scheduled_time: scheduledTime,
        taken_time: now.toISOString(),
        status,
        delay_minutes: delayMinutes > 0 ? delayMinutes : 0,
        context: context || undefined
      });
    },
    onMutate: async ({ medication, scheduledTime, status, context }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['logs', 'today']);

      // Snapshot previous value
      const previousLogs = queryClient.getQueryData(['logs', 'today']);

      // Optimistically update
      const now = new Date();
      const [hours, minutes] = scheduledTime.split(':');
      const scheduledDate = new Date();
      scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      const delayMinutes = Math.floor((now - scheduledDate) / 60000);

      const optimisticLog = {
        id: `temp-${Date.now()}`,
        medication_id: medication.id,
        medication_name: medication.name,
        scheduled_time: scheduledTime,
        taken_time: now.toISOString(),
        status,
        delay_minutes: delayMinutes > 0 ? delayMinutes : 0,
        context: context || undefined,
        created_date: now.toISOString()
      };

      queryClient.setQueryData(['logs', 'today'], (old = []) => [...old, optimisticLog]);

      return { previousLogs };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['logs', 'today'], context.previousLogs);
      toast.error('Failed to log medication');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['logs']);
      toast.success('Logged successfully');
      setContextNotes({});
    }
  });

  const handleLog = (item, status) => {
    const context = contextNotes[`${item.medication.id}-${item.scheduledTime}`];
    logMedicationMutation.mutate({
      medication: item.medication,
      scheduledTime: item.scheduledTime,
      status,
      context
    });
  };

  const now = new Date();
  const currentTime = format(now, 'HH:mm');

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Today's Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        {schedule.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No medications scheduled for today</p>
        ) : (
          <div className="space-y-4">
            {schedule.map((item, index) => {
              const isPast = item.scheduledTime < currentTime;
              const isCritical = item.medication.critical;
              
              return (
                <div
                  key={`${item.medication.id}-${item.scheduledTime}`}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    item.log?.status === 'taken'
                      ? 'bg-green-50 border-green-200'
                      : item.log?.status === 'missed'
                      ? 'bg-red-50 border-red-200'
                      : isPast && isCritical
                      ? 'bg-orange-50 border-orange-400'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-bold text-gray-900">
                          {item.scheduledTime}
                        </span>
                        {isCritical && (
                          <Badge className="bg-red-500 text-white">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Critical
                          </Badge>
                        )}
                        {item.log && (
                          <Badge
                            className={
                              item.log.status === 'taken'
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                            }
                          >
                            {item.log.status === 'taken' ? 'Taken' : 'Missed'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        {item.medication.name}
                      </p>
                      <p className="text-gray-600">{item.medication.dosage}</p>
                      {item.medication.notes && (
                        <p className="text-sm text-gray-500 mt-1">{item.medication.notes}</p>
                      )}
                      
                      {item.log?.delay_minutes > 0 && (
                        <p className="text-sm text-orange-600 mt-1">
                          Taken {item.log.delay_minutes} minutes late
                        </p>
                      )}
                      
                      {item.log?.context && (
                        <p className="text-sm text-gray-600 mt-1 italic">
                          Note: {item.log.context}
                        </p>
                      )}
                    </div>

                    {!item.log && (
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleLog(item, 'taken')}
                          className="bg-green-600 hover:bg-green-700 h-11 select-none"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Taken
                        </Button>
                        <Button
                          onClick={() => handleLog(item, 'missed')}
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 h-11 select-none"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Missed
                        </Button>
                      </div>
                    )}
                  </div>

                  {!item.log && (
                    <div className="mt-3">
                      <Textarea
                        placeholder="Add context note (optional): traveling, busy, forgot, etc."
                        value={contextNotes[`${item.medication.id}-${item.scheduledTime}`] || ''}
                        onChange={(e) =>
                          setContextNotes({
                            ...contextNotes,
                            [`${item.medication.id}-${item.scheduledTime}`]: e.target.value
                          })
                        }
                        className="text-sm"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}