import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileText, FileSpreadsheet, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isWithinInterval } from 'date-fns';

export default function EnhancedDataExport({ user }) {
  const [isExporting, setIsExporting] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMedication, setSelectedMedication] = useState('all');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [includeData, setIncludeData] = useState({
    medications: true,
    adherenceStats: true,
    logs: true,
    symptoms: true,
    mood: true,
    checkIns: true,
    achievements: true
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Fetch all data
      const [medications, logs, checkIns, moods, achievements] = await Promise.all([
        base44.entities.Medication.list(),
        base44.entities.MedicationLog.list('-created_date', 10000),
        base44.entities.CheckIn.list('-created_date', 1000),
        base44.entities.DailyMood.list('-date', 1000),
        base44.entities.Achievement.list()
      ]);

      // Filter by date range
      let filteredLogs = logs;
      let filteredMoods = moods;
      let filteredCheckIns = checkIns;

      if (dateFrom || dateTo) {
        const fromDate = dateFrom ? parseISO(dateFrom) : new Date(0);
        const toDate = dateTo ? parseISO(dateTo + 'T23:59:59') : new Date();

        filteredLogs = logs.filter(log => {
          const logDate = parseISO(log.taken_time || log.created_date);
          return isWithinInterval(logDate, { start: fromDate, end: toDate });
        });

        filteredMoods = moods.filter(mood => {
          const moodDate = parseISO(mood.date);
          return isWithinInterval(moodDate, { start: fromDate, end: toDate });
        });

        filteredCheckIns = checkIns.filter(checkIn => {
          const checkInDate = parseISO(checkIn.date);
          return isWithinInterval(checkInDate, { start: fromDate, end: toDate });
        });
      }

      // Filter by medication
      if (selectedMedication !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.medication_id === selectedMedication);
      }

      // Calculate adherence statistics
      const adherenceStats = calculateAdherenceStats(filteredLogs, medications);

      // Generate export based on format
      if (exportFormat === 'pdf') {
        await generatePDFReport({
          user,
          medications,
          logs: filteredLogs,
          moods: filteredMoods,
          checkIns: filteredCheckIns,
          achievements,
          adherenceStats,
          includeData,
          dateFrom,
          dateTo
        });
      } else if (exportFormat === 'csv') {
        await generateCSVReport({
          medications,
          logs: filteredLogs,
          moods: filteredMoods,
          adherenceStats,
          includeData
        });
      } else {
        await generateJSONReport({
          user,
          medications,
          logs: filteredLogs,
          moods: filteredMoods,
          checkIns: filteredCheckIns,
          achievements,
          adherenceStats,
          includeData
        });
      }

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const calculateAdherenceStats = (logs, medications) => {
    const stats = {
      totalDoses: logs.length,
      takenOnTime: logs.filter(l => l.status === 'taken' && (!l.delay_minutes || l.delay_minutes <= 15)).length,
      takenLate: logs.filter(l => l.status === 'taken' && l.delay_minutes > 15).length,
      missed: logs.filter(l => l.status === 'missed').length,
      partial: logs.filter(l => l.status === 'partial').length,
      adherenceRate: 0,
      byMedication: {}
    };

    const takenDoses = stats.takenOnTime + stats.takenLate + stats.partial;
    stats.adherenceRate = stats.totalDoses > 0 ? ((takenDoses / stats.totalDoses) * 100).toFixed(1) : 0;

    // Per medication stats
    medications.forEach(med => {
      const medLogs = logs.filter(l => l.medication_id === med.id);
      const medTaken = medLogs.filter(l => l.status === 'taken' || l.status === 'partial').length;
      stats.byMedication[med.name] = {
        total: medLogs.length,
        taken: medTaken,
        missed: medLogs.filter(l => l.status === 'missed').length,
        adherenceRate: medLogs.length > 0 ? ((medTaken / medLogs.length) * 100).toFixed(1) : 0
      };
    });

    return stats;
  };

  const generatePDFReport = async (data) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.text('Medication Adherence Report', 20, y);
    y += 10;

    // Patient info
    doc.setFontSize(10);
    doc.text(`Patient: ${data.user.full_name}`, 20, y);
    y += 6;
    doc.text(`Report Date: ${format(new Date(), 'PPP')}`, 20, y);
    y += 6;
    if (data.dateFrom || data.dateTo) {
      doc.text(`Period: ${data.dateFrom || 'Start'} to ${data.dateTo || 'Today'}`, 20, y);
      y += 6;
    }
    y += 4;

    // Adherence Summary
    if (data.includeData.adherenceStats) {
      doc.setFontSize(14);
      doc.text('Adherence Summary', 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.text(`Overall Adherence Rate: ${data.adherenceStats.adherenceRate}%`, 25, y);
      y += 6;
      doc.text(`Total Doses: ${data.adherenceStats.totalDoses}`, 25, y);
      y += 6;
      doc.text(`Taken On Time: ${data.adherenceStats.takenOnTime}`, 25, y);
      y += 6;
      doc.text(`Taken Late: ${data.adherenceStats.takenLate}`, 25, y);
      y += 6;
      doc.text(`Missed: ${data.adherenceStats.missed}`, 25, y);
      y += 10;
    }

    // Current Medications
    if (data.includeData.medications) {
      doc.setFontSize(14);
      doc.text('Current Medications', 20, y);
      y += 8;

      doc.setFontSize(9);
      data.medications.filter(m => m.active).forEach(med => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(`• ${med.name} - ${med.dosage}`, 25, y);
        y += 5;
        doc.text(`  Schedule: ${med.times.join(', ')}`, 27, y);
        y += 5;
        if (data.adherenceStats.byMedication[med.name]) {
          const stats = data.adherenceStats.byMedication[med.name];
          doc.text(`  Adherence: ${stats.adherenceRate}% (${stats.taken}/${stats.total})`, 27, y);
          y += 5;
        }
        if (med.notes) {
          doc.text(`  Notes: ${med.notes}`, 27, y);
          y += 5;
        }
        y += 3;
      });
      y += 5;
    }

    // Symptoms & Side Effects
    if (data.includeData.symptoms && data.moods.length > 0) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.text('Symptoms & Mood Log', 20, y);
      y += 8;

      doc.setFontSize(9);
      data.moods.slice(0, 15).forEach(mood => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(`${format(parseISO(mood.date), 'MMM d, yyyy')} - Mood: ${mood.mood}, Energy: ${mood.energy_level || 'N/A'}/10`, 25, y);
        y += 5;
        if (mood.symptoms && mood.symptoms.length > 0) {
          doc.text(`  Symptoms: ${mood.symptoms.join(', ')}`, 27, y);
          y += 5;
        }
        if (mood.notes) {
          doc.text(`  Notes: ${mood.notes.substring(0, 80)}${mood.notes.length > 80 ? '...' : ''}`, 27, y);
          y += 5;
        }
        y += 2;
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.text('This report is for informational purposes only. Not a medical diagnosis or advice.', 20, 285);

    // Save
    const filename = `medication-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const generateCSVReport = async (data) => {
    let csv = '';

    // Adherence logs
    if (data.includeData.logs) {
      csv += 'Medication Log\n';
      csv += 'Date,Time,Medication,Dosage,Status,Delay (min),Notes\n';
      data.logs.forEach(log => {
        const med = data.medications.find(m => m.id === log.medication_id);
        const date = log.taken_time || log.created_date;
        csv += `${format(parseISO(date), 'yyyy-MM-dd')},${format(parseISO(date), 'HH:mm')},${log.medication_name || 'Unknown'},"${med?.dosage || ''}",${log.status},${log.delay_minutes || 0},"${log.context || ''}"\n`;
      });
      csv += '\n';
    }

    // Symptoms & Mood
    if (data.includeData.symptoms && data.moods.length > 0) {
      csv += 'Mood & Symptoms Log\n';
      csv += 'Date,Mood,Energy Level,Sleep Quality,Symptoms,Notes\n';
      data.moods.forEach(mood => {
        csv += `${mood.date},${mood.mood},${mood.energy_level || ''},"${mood.sleep_quality || ''}","${(mood.symptoms || []).join('; ')}","${mood.notes || ''}"\n`;
      });
      csv += '\n';
    }

    // Adherence stats
    if (data.includeData.adherenceStats) {
      csv += 'Adherence Statistics by Medication\n';
      csv += 'Medication,Total Doses,Taken,Missed,Adherence Rate\n';
      Object.entries(data.adherenceStats.byMedication).forEach(([name, stats]) => {
        csv += `${name},${stats.total},${stats.taken},${stats.missed},${stats.adherenceRate}%\n`;
      });
    }

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medication-data-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateJSONReport = async (data) => {
    const exportData = {
      export_date: new Date().toISOString(),
      date_range: {
        from: data.dateFrom || 'all',
        to: data.dateTo || 'all'
      },
      patient: {
        name: data.user.full_name,
        email: data.user.email
      },
      adherence_statistics: data.includeData.adherenceStats ? data.adherenceStats : undefined,
      current_medications: data.includeData.medications ? data.medications : undefined,
      medication_logs: data.includeData.logs ? data.logs : undefined,
      mood_logs: data.includeData.mood ? data.moods : undefined,
      check_ins: data.includeData.checkIns ? data.checkIns : undefined,
      achievements: data.includeData.achievements ? data.achievements : undefined
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medication-data-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="shadow-md border-l-4 border-l-blue-500 dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-white">
          <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Enhanced Data Export
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Generate comprehensive reports for healthcare providers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="dark:text-white text-sm">From Date</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="dark:text-white text-sm">To Date</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        {/* Export Format */}
        <div className="space-y-2">
          <Label className="dark:text-white text-sm">Export Format</Label>
          <MobileSelect
            value={exportFormat}
            onValueChange={setExportFormat}
            placeholder="Select format"
            options={[
              { value: 'pdf', label: 'PDF Report (For Doctors)' },
              { value: 'csv', label: 'CSV Spreadsheet (For Analysis)' },
              { value: 'json', label: 'JSON (Complete Backup)' }
            ]}
          />
        </div>

        {/* Include Options */}
        <div className="space-y-3">
          <Label className="dark:text-white text-sm">Include in Export:</Label>
          <div className="space-y-2">
            {Object.entries({
              medications: 'Current Medications List',
              adherenceStats: 'Adherence Statistics',
              logs: 'Medication History Logs',
              symptoms: 'Symptoms & Side Effects',
              mood: 'Mood Tracking Data',
              checkIns: 'Daily Check-ins',
              achievements: 'Progress & Achievements'
            }).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg min-h-[44px]">
                <Checkbox
                  id={key}
                  checked={includeData[key]}
                  onCheckedChange={(checked) => setIncludeData({ ...includeData, [key]: checked })}
                />
                <Label htmlFor={key} className="text-sm dark:text-white flex-1 cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              {exportFormat === 'pdf' && <FileText className="w-5 h-5 mr-2" />}
              {exportFormat === 'csv' && <FileSpreadsheet className="w-5 h-5 mr-2" />}
              {exportFormat === 'json' && <Download className="w-5 h-5 mr-2" />}
              Generate {exportFormat.toUpperCase()} Report
            </>
          )}
        </Button>

        {/* Info Notice */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-xs text-blue-900 dark:text-blue-200">
            <strong>📄 Report Features:</strong> PDF reports are formatted for healthcare providers. 
            CSV files work with Excel/Google Sheets for analysis. 
            JSON includes complete raw data for backup purposes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}