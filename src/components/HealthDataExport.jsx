import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileJson, FileSpreadsheet, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function HealthDataExport() {
  const [exporting, setExporting] = useState(false);

  const exportAsCSV = async () => {
    setExporting(true);
    try {
      const [medications, logs, checkIns] = await Promise.all([
        base44.entities.Medication.list(),
        base44.entities.MedicationLog.list('-created_date', 1000),
        base44.entities.CheckIn.list('-created_date', 1000)
      ]);

      // Create CSV with health app compatible format
      const csvRows = [
        ['Date', 'Time', 'Medication', 'Dosage', 'Status', 'Adherence', 'Context', 'Notes']
      ];

      logs.forEach(log => {
        const med = medications.find(m => m.id === log.medication_id);
        const checkIn = checkIns.find(c => c.date === log.taken_time?.split('T')[0]);
        
        csvRows.push([
          log.taken_time ? format(new Date(log.taken_time), 'yyyy-MM-dd') : log.scheduled_time?.split('T')[0] || '',
          log.scheduled_time,
          log.medication_name,
          med?.dosage || '',
          log.status,
          log.status === 'taken' ? '100%' : '0%',
          log.context || checkIn?.context || '',
          log.delay_minutes ? `Delayed ${log.delay_minutes} min` : ''
        ]);
      });

      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medmind-health-data-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Health data exported as CSV');
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const exportAsJSON = async () => {
    setExporting(true);
    try {
      const [medications, logs, checkIns, achievements] = await Promise.all([
        base44.entities.Medication.list(),
        base44.entities.MedicationLog.list('-created_date', 1000),
        base44.entities.CheckIn.list('-created_date', 1000),
        base44.entities.Achievement.list()
      ]);

      // Calculate adherence stats
      const takenLogs = logs.filter(l => l.status === 'taken');
      const adherenceRate = logs.length > 0 ? (takenLogs.length / logs.length * 100).toFixed(1) : 0;

      const healthData = {
        export_date: new Date().toISOString(),
        app: 'MedMind',
        version: '1.0',
        summary: {
          total_medications: medications.length,
          active_medications: medications.filter(m => m.active).length,
          total_logs: logs.length,
          adherence_rate: `${adherenceRate}%`,
          achievements_earned: achievements.length
        },
        medications: medications.map(m => ({
          name: m.name,
          dosage: m.dosage,
          dosage_form: m.dosage_form,
          manufacturer: m.manufacturer,
          frequency: m.frequency,
          times: m.times,
          critical: m.critical,
          active: m.active,
          quantity_remaining: m.quantity_remaining,
          last_refill_date: m.last_refill_date
        })),
        adherence_logs: logs.map(l => ({
          date: l.taken_time || l.scheduled_time,
          medication: l.medication_name,
          scheduled_time: l.scheduled_time,
          taken_time: l.taken_time,
          status: l.status,
          delay_minutes: l.delay_minutes,
          context: l.context
        })),
        daily_check_ins: checkIns.map(c => ({
          date: c.date,
          routine_disrupted: c.routine_disrupted,
          context: c.context,
          location_changed: c.location_changed,
          notes: c.notes
        })),
        achievements: achievements.map(a => ({
          name: a.badge_name,
          description: a.badge_description,
          earned_date: a.earned_date,
          category: a.category
        }))
      };

      const blob = new Blob([JSON.stringify(healthData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medmind-health-data-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Health data exported as JSON');
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const exportHealthAppFormat = async () => {
    setExporting(true);
    try {
      const [medications, logs] = await Promise.all([
        base44.entities.Medication.list(),
        base44.entities.MedicationLog.list('-created_date', 1000)
      ]);

      // Create FHIR-inspired format compatible with many health platforms
      const healthAppData = {
        resourceType: 'Bundle',
        type: 'collection',
        timestamp: new Date().toISOString(),
        entry: logs.map(log => {
          const med = medications.find(m => m.id === log.medication_id);
          return {
            resource: {
              resourceType: 'MedicationAdministration',
              status: log.status === 'taken' ? 'completed' : log.status === 'missed' ? 'not-done' : 'in-progress',
              medicationCodeableConcept: {
                text: log.medication_name
              },
              dosage: {
                text: med?.dosage || '',
                route: {
                  text: med?.dosage_form || 'oral'
                }
              },
              effectiveDateTime: log.taken_time || log.scheduled_time,
              note: log.context ? [{ text: log.context }] : []
            }
          };
        })
      };

      const blob = new Blob([JSON.stringify(healthAppData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medmind-fhir-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Health app format exported');
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          <CardTitle className="dark:text-white">Health App Integration</CardTitle>
        </div>
        <CardDescription className="dark:text-gray-400">
          Export your medication adherence data to sync with Apple Health, Google Fit, or other health tracking apps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={exportAsCSV}
          disabled={exporting}
          variant="outline"
          className="w-full h-11 justify-start dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as CSV (Excel, Google Sheets)
        </Button>

        <Button
          onClick={exportAsJSON}
          disabled={exporting}
          variant="outline"
          className="w-full h-11 justify-start dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <FileJson className="w-4 h-4 mr-2" />
          Export as JSON (Complete Data)
        </Button>

        <Button
          onClick={exportHealthAppFormat}
          disabled={exporting}
          variant="outline"
          className="w-full h-11 justify-start dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Health App Format (FHIR)
        </Button>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          💡 <strong>Tip:</strong> Import CSV files into Apple Health via the Health app's data import feature, 
          or use third-party apps like MyFitnessPal or Health Sync to import into Google Fit.
        </p>
      </CardContent>
    </Card>
  );
}