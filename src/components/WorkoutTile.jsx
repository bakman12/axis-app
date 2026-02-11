import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Activity, Play, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const intensityColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

export default function WorkoutTile({ workout, index }) {
  const { name, duration, intensity, description, videoUrl, tips } = workout;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-300">{index}</span>
            </div>
            <h3 className="font-semibold text-base">{name}</h3>
          </div>
          <Badge className={intensityColors[intensity?.toLowerCase()] || intensityColors.moderate}>
            {intensity}
          </Badge>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {description}
        </p>

        <div className="flex items-center gap-4 mb-3 text-sm">
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <Activity className="w-4 h-4" />
            <span>{intensity} intensity</span>
          </div>
        </div>

        {tips && tips.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">💡 Tips:</p>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              {tips.slice(0, 2).map((tip, idx) => (
                <li key={idx} className="line-clamp-1">• {tip}</li>
              ))}
            </ul>
          </div>
        )}

        {videoUrl && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.open(videoUrl, '_blank')}
          >
            <Play className="w-4 h-4 mr-2" />
            Watch Tutorial
            <ExternalLink className="w-3 h-3 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}