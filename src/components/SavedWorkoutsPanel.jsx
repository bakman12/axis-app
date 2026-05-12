import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Clock, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SavedWorkoutsPanel() {
  const { data: savedWorkouts = [], refetch } = useQuery({
    queryKey: ['savedWorkouts'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return user.saved_workouts || [];
    }
  });

  const handleRemove = async (index) => {
    try {
      const user = await base44.auth.me();
      const updated = [...(user.saved_workouts || [])];
      updated.splice(index, 1);
      await base44.auth.updateMe({ saved_workouts: updated });
      refetch();
      toast.success('Workout removed');
    } catch (error) {
      toast.error('Failed to remove workout');
    }
  };

  if (savedWorkouts.length === 0) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Dumbbell className="w-5 h-5 text-orange-500" />
          Saved Workouts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {savedWorkouts.map((workout, idx) => (
          <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-sm dark:text-white">{workout.name}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{workout.description}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemove(idx)}
                className="h-8 w-8 p-0 ml-2"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {workout.duration}
              </span>
              <Badge variant="outline" className="text-xs">
                {workout.intensity}
              </Badge>
            </div>
            {workout.videoUrl && (
              <Button
                size="sm"
                variant="link"
                className="mt-2 h-auto p-0 text-xs"
                onClick={() => window.open(workout.videoUrl, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Watch video guide
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}