import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, subMonths, subDays } from 'date-fns';
import PremiumBadge from './PremiumBadge';
import { usePremiumAccess } from './PremiumGate';

export default function HealthReportGenerator() {
  const { isPro } = usePremiumAccess();
  const [generating, setGenerating] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });

  const quickRanges = [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 3 Months', days: 90 },
    { label: 'Last 6 Months', days: 180 }
  ];

  const handleQuickRange = (days) => {
    setDateRange({
      startDate: format(subDays(new Date(), days), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const handleGenerate = async () => {
    if (!isPro) {
      toast.error('Health reports are a Pro feature');
      return;
    }

    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateHealthReport', dateRange);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('Health report generated successfully!');
    } catch (error) {
      console.error('Report generation failed:', error);
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Healthcare Provider Report
            </CardTitle>
            <CardDescription>
              Generate comprehensive PDF reports for your doctor
            </CardDescription>
          </div>
          <PremiumBadge tier="pro" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isPro ? (
          <div className="text-center py-6">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Upgrade to Pro to generate detailed health reports with AI insights and comprehensive analytics
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  max={dateRange.endDate}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  min={dateRange.startDate}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Quick Ranges</Label>
              <div className="flex flex-wrap gap-2">
                {quickRanges.map((range) => (
                  <Button
                    key={range.days}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickRange(range.days)}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg mb-4">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  <strong>What's included:</strong> Medication adherence statistics, time-of-day patterns, 
                  AI-generated clinical insights, areas of concern, and personalized recommendations.
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={generating || !dateRange.startDate || !dateRange.endDate}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Generate Health Report
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}