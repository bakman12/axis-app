import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

// Apple Health / Google Fit integration — requires @capacitor/health plugin.
// Plugin not yet configured; component is intentionally dormant until native build is set up.
export default function HealthDataIntegration() {
  return (
    <Card className="shadow-md border-l-4 border-l-orange-500 dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-white">
          <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          Health App Integration
          <Badge variant="outline" className="ml-auto text-xs dark:border-gray-600 dark:text-gray-400">
            Coming Soon
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Apple Health and Google Fit integration will allow syncing activity data to correlate with medication adherence.
          This feature requires a native app build and will be available in a future release.
        </p>
      </CardContent>
    </Card>
  );
}
