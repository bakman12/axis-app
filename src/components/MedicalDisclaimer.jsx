import { AlertTriangle, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function MedicalDisclaimer() {
  return (
    <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 mb-6">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              Important Medical Disclaimer
            </p>
            <p className="text-amber-800 dark:text-amber-200">
              Axis is a <strong>medication tracking and reminder tool only</strong>. It does not provide medical advice, diagnosis, or treatment recommendations.
            </p>
            <ul className="space-y-1 text-amber-800 dark:text-amber-200 ml-4 list-disc">
              <li>Always follow your doctor's or pharmacist's instructions</li>
              <li>Never start, stop, or change medications without consulting your healthcare provider</li>
              <li>For medical emergencies, call 999 immediately</li>
              <li>For urgent medical advice, call NHS 111</li>
              <li>If you miss a dose or have concerns, contact your GP or pharmacist</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PrivacyNotice() {
  return (
    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              Your Privacy & Data Protection
            </p>
            <ul className="space-y-1 text-blue-800 dark:text-blue-200 ml-4 list-disc">
              <li>Your medication data is encrypted and stored securely</li>
              <li>We never share your health information with third parties</li>
              <li>AI analysis happens within your private account only</li>
              <li>You can export or delete all your data at any time</li>
              <li>No data is used for marketing or sold to advertisers</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}