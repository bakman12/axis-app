import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smile, Meh, Frown, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const moods = [
  { value: 'great', label: 'Great', icon: '😄', color: 'bg-green-100 text-green-800' },
  { value: 'good', label: 'Good', icon: '🙂', color: 'bg-blue-100 text-blue-800' },
  { value: 'okay', label: 'Okay', icon: '😐', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'low', label: 'Low', icon: '😔', color: 'bg-orange-100 text-orange-800' },
  { value: 'struggling', label: 'Struggling', icon: '😞', color: 'bg-red-100 text-red-800' }
];

export default function DailyMoodCheckIn() {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: todayMood } = useQuery({
    queryKey: ['dailyMood', today],
    queryFn: async () => {
      const moods = await base44.entities.DailyMood.filter({ date: today });
      return moods[0] || null;
    }
  });

  const createMoodMutation = useMutation({
    mutationFn: (mood) => base44.entities.DailyMood.create({
      date: today,
      mood,
      energy_level: 5
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyMood', today] });
      toast.success('Mood logged! Your health coach will take this into account.');
    }
  });

  if (todayMood) {
    const moodData = moods.find(m => m.value === todayMood.mood);
    return (
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">Daily mood logged</p>
              <p className="text-xs text-gray-500">
                Feeling {moodData?.icon} {moodData?.label}
              </p>
            </div>
            <Badge className={moodData?.color}>
              {moodData?.icon}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader>
        <CardTitle className="text-base">How are you feeling today?</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {moods.map(mood => (
            <button
              key={mood.value}
              onClick={() => createMoodMutation.mutate(mood.value)}
              disabled={createMoodMutation.isPending}
              className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="text-2xl mb-1">{mood.icon}</span>
              <span className="text-[10px] text-gray-600 dark:text-gray-400">{mood.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Your health coach uses this to personalize recommendations
        </p>
      </CardContent>
    </Card>
  );
}