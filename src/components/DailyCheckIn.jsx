import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { toast } from 'sonner';

const CONTEXT_OPTIONS = [
  { value: 'normal', label: 'Normal routine', icon: '✅' },
  { value: 'traveling', label: 'Traveling', icon: '✈️' },
  { value: 'busy_day', label: 'Busy/hectic day', icon: '⚡' },
  { value: 'not_feeling_well', label: 'Not feeling well', icon: '🤒' },
  { value: 'poor_sleep', label: 'Poor sleep last night', icon: '😴' },
  { value: 'schedule_change', label: 'Schedule changed', icon: '📅' },
  { value: 'stressed', label: 'Stressed/anxious', icon: '😰' }
];

export default function DailyCheckIn() {
  const [selectedContext, setSelectedContext] = useState('normal');
  const [routineDisrupted, setRoutineDisrupted] = useState(false);
  const [locationChanged, setLocationChanged] = useState(false);
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: todayCheckIn, isLoading } = useQuery({
    queryKey: ['checkin', today],
    queryFn: async () => {
      const checkIns = await base44.entities.CheckIn.filter({ date: today });
      return checkIns[0] || null;
    }
  });

  useEffect(() => {
    if (todayCheckIn) {
      setSelectedContext(todayCheckIn.context);
      setRoutineDisrupted(todayCheckIn.routine_disrupted);
      setLocationChanged(todayCheckIn.location_changed);
      setNotes(todayCheckIn.notes || '');
    }
  }, [todayCheckIn]);

  const checkInMutation = useMutation({
    mutationFn: (data) => {
      if (todayCheckIn) {
        return base44.entities.CheckIn.update(todayCheckIn.id, data);
      }
      return base44.entities.CheckIn.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['checkin']);
      queryClient.invalidateQueries(['predictions']);
      toast.success('Check-in saved');
    }
  });

  const handleSubmit = () => {
    checkInMutation.mutate({
      date: today,
      context: selectedContext,
      routine_disrupted: routineDisrupted,
      location_changed: locationChanged,
      notes: notes || undefined
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {todayCheckIn ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-orange-500" />
          )}
          Daily Check-In
        </CardTitle>
        <p className="text-sm text-gray-600">
          Help the AI understand your day for better predictions
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="mb-3 block">How's your day today?</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CONTEXT_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedContext(option.value);
                    setRoutineDisrupted(option.value !== 'normal');
                  }}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedContext === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="text-sm font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label>Different location?</Label>
              <p className="text-xs text-gray-500">Not at your usual place</p>
            </div>
            <Switch
              checked={locationChanged}
              onCheckedChange={setLocationChanged}
            />
          </div>

          <div>
            <Label htmlFor="notes">Additional notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other details about today..."
              rows={2}
              className="mt-2"
            />
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={checkInMutation.isPending}
          >
            {todayCheckIn ? 'Update Check-In' : 'Save Check-In'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}