import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startDate, endDate } = await req.json();
    console.log('Generating health report from', startDate, 'to', endDate);

    // Fetch data
    const [medications, logs, checkIns] = await Promise.all([
      base44.entities.Medication.filter({ active: true }),
      base44.entities.MedicationLog.list('-created_date', 1000),
      base44.entities.CheckIn.list('-created_date', 100)
    ]);

    // Filter logs by date range
    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.created_date);
      return logDate >= new Date(startDate) && logDate <= new Date(endDate);
    });

    // Calculate statistics
    const takenLogs = filteredLogs.filter(l => l.status === 'taken');
    const missedLogs = filteredLogs.filter(l => l.status === 'missed');
    const delayedLogs = filteredLogs.filter(l => l.status === 'delayed');
    const adherenceRate = filteredLogs.length > 0 
      ? Math.round((takenLogs.length / filteredLogs.length) * 100) 
      : 0;

    // Medication-specific stats
    const medStats = medications.map(med => {
      const medLogs = filteredLogs.filter(l => l.medication_id === med.id);
      const medTaken = medLogs.filter(l => l.status === 'taken').length;
      const medAdherence = medLogs.length > 0 ? Math.round((medTaken / medLogs.length) * 100) : 0;
      
      return {
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        total: medLogs.length,
        taken: medTaken,
        missed: medLogs.filter(l => l.status === 'missed').length,
        adherence: medAdherence
      };
    });

    // Time of day analysis
    const timeAnalysis = filteredLogs.reduce((acc, log) => {
      const hour = parseInt(log.scheduled_time?.split(':')[0] || '0');
      const period = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
      
      if (!acc[period]) acc[period] = { taken: 0, total: 0 };
      acc[period].total++;
      if (log.status === 'taken') acc[period].taken++;
      
      return acc;
    }, {});

    // Generate AI insights
    const insights = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate professional clinical insights for a healthcare provider based on this medication adherence data:

PATIENT ADHERENCE DATA (${startDate} to ${endDate}):
- Overall adherence rate: ${adherenceRate}%
- Total doses: ${filteredLogs.length}
- Taken: ${takenLogs.length}
- Missed: ${missedLogs.length}
- Delayed: ${delayedLogs.length}

MEDICATION-SPECIFIC ADHERENCE:
${medStats.map(m => `- ${m.name} (${m.dosage}): ${m.adherence}% (${m.taken}/${m.total})`).join('\n')}

TIME OF DAY PATTERNS:
${Object.entries(timeAnalysis).map(([time, stats]) => 
  `- ${time}: ${stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 0}%`
).join('\n')}

DISRUPTIONS:
${checkIns.filter(c => c.routine_disrupted).map(c => 
  `- ${c.date}: ${c.context} ${c.notes ? '(' + c.notes + ')' : ''}`
).slice(0, 5).join('\n')}

Provide:
1. A brief clinical summary (2-3 sentences)
2. Key observations about adherence patterns (3-4 bullet points)
3. Potential areas of concern for the healthcare provider (2-3 bullet points)
4. Recommendations for optimization (2-3 bullet points)

Keep it professional, concise, and clinically relevant.`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          observations: { type: "array", items: { type: "string" } },
          concerns: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } }
        }
      }
    });

    // Generate PDF
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(31, 41, 55);
    doc.text('Medication Adherence Report', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Report Period: ${startDate} to ${endDate}`, 20, y);
    y += 5;
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
    y += 5;
    doc.text(`Patient: ${user.full_name || user.email}`, 20, y);
    y += 15;

    // Summary Statistics
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text('Summary Statistics', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    const stats = [
      `Overall Adherence Rate: ${adherenceRate}%`,
      `Total Doses Scheduled: ${filteredLogs.length}`,
      `Doses Taken: ${takenLogs.length}`,
      `Doses Missed: ${missedLogs.length}`,
      `Doses Delayed: ${delayedLogs.length}`
    ];

    stats.forEach(stat => {
      doc.text(stat, 25, y);
      y += 7;
    });
    y += 8;

    // AI Clinical Summary
    if (insights.summary) {
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Clinical Summary', 20, y);
      y += 10;

      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const summaryLines = doc.splitTextToSize(insights.summary, 170);
      summaryLines.forEach(line => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 25, y);
        y += 5;
      });
      y += 8;
    }

    // Medication Details
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text('Medication-Specific Adherence', 20, y);
    y += 10;

    doc.setFontSize(9);
    medStats.forEach(med => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(31, 41, 55);
      doc.text(`${med.name} (${med.dosage})`, 25, y);
      y += 5;
      
      doc.setTextColor(75, 85, 99);
      doc.text(`Frequency: ${med.frequency.replace(/_/g, ' ')}`, 30, y);
      y += 5;
      doc.text(`Adherence: ${med.adherence}% (${med.taken}/${med.total} doses)`, 30, y);
      y += 5;
      if (med.missed > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(`Missed: ${med.missed} doses`, 30, y);
        y += 5;
      }
      y += 3;
    });
    y += 5;

    // Time of Day Analysis
    if (Object.keys(timeAnalysis).length > 0) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Time of Day Analysis', 20, y);
      y += 10;

      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      Object.entries(timeAnalysis).forEach(([period, stats]) => {
        const rate = stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 0;
        doc.text(`${period}: ${rate}% adherence (${stats.taken}/${stats.total})`, 25, y);
        y += 6;
      });
      y += 8;
    }

    // Key Observations
    if (insights.observations?.length > 0) {
      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Key Observations', 20, y);
      y += 10;

      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      insights.observations.forEach(obs => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const lines = doc.splitTextToSize(`• ${obs}`, 165);
        lines.forEach(line => {
          doc.text(line, 25, y);
          y += 5;
        });
        y += 2;
      });
      y += 8;
    }

    // Areas of Concern
    if (insights.concerns?.length > 0) {
      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38);
      doc.text('Areas of Concern', 20, y);
      y += 10;

      doc.setFontSize(9);
      doc.setTextColor(153, 27, 27);
      insights.concerns.forEach(concern => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const lines = doc.splitTextToSize(`• ${concern}`, 165);
        lines.forEach(line => {
          doc.text(line, 25, y);
          y += 5;
        });
        y += 2;
      });
      y += 8;
    }

    // Recommendations
    if (insights.recommendations?.length > 0) {
      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Recommendations', 20, y);
      y += 10;

      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      insights.recommendations.forEach(rec => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const lines = doc.splitTextToSize(`• ${rec}`, 165);
        lines.forEach(line => {
          doc.text(line, 25, y);
          y += 5;
        });
        y += 2;
      });
    }

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
      doc.text('Generated by MedMind - For Healthcare Provider Use Only', 105, 285, { align: 'center' });
    }

    const pdfBytes = doc.output('arraybuffer');
    console.log('Health report generated successfully');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=health-report-${startDate}-to-${endDate}.pdf`
      }
    });
  } catch (error) {
    console.error('Health report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});