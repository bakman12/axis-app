import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function CriticalMedicationWarning({ medication }) {
  if (!medication.critical) return null;

  return (
    <Card className="bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 mt-2">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-900 dark:text-red-100 mb-1">
              Critical Time-Sensitive Medication
            </p>
            <p className="text-red-800 dark:text-red-200 text-xs">
              This medication has been marked as time-sensitive. Taking it at the prescribed time is important. 
              If you miss a dose, <strong>contact your pharmacist or GP immediately</strong> for guidance - do not double up or skip doses without professional advice.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}