import { useState } from 'react';
import { getAuditLog, clearAuditLog, verifyAuditLog } from '@/lib/auditLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

// Human-readable labels for each event type
const EVENT_LABELS = {
  'app.unlocked':              'App unlocked',
  'app.locked':                'App locked',
  'medication.added':          'Medication added',
  'medication.updated':        'Medication updated',
  'medication.deleted':        'Medication deleted',
  'dose.logged':               'Dose logged',
  'dose.skipped':              'Dose skipped',
  'data.exported':             'Data exported',
  'security.pin_changed':      'PIN changed',
  'security.biometric_enrolled': 'Biometric enrolled',
  'security.breach_detected':  'Security breach detected',
  'emergency_id.viewed':       'Emergency ID viewed',
};

// Colour-code by event category
function eventColor(event) {
  if (event.includes('breach') || event.includes('deleted')) return 'text-red-500';
  if (event.includes('security') || event.includes('locked')) return 'text-orange-500';
  if (event.includes('added') || event.includes('logged') || event.includes('unlocked')) return 'text-green-500';
  return 'text-blue-500';
}

export default function AuditLogViewer() {
  const [expanded, setExpanded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [log, setLog] = useState(() => getAuditLog());
  const integrity = verifyAuditLog();

  const handleClear = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearAuditLog();
    setLog([]);
    setConfirmClear(false);
  };

  const refresh = () => setLog(getAuditLog());

  return (
    <Card className="bg-white/80 dark:bg-gray-900/50 border-gray-200/50 dark:border-gray-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold dark:text-white flex items-center gap-2">
            {integrity.valid
              ? <ShieldCheck className="w-4 h-4 text-green-500" />
              : <ShieldAlert className="w-4 h-4 text-red-500" />}
            Audit Log
            <span className="text-xs font-normal text-gray-500">({log.length} events)</span>
          </CardTitle>
          <button
            onClick={() => { setExpanded(e => !e); refresh(); }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        {!integrity.valid && (
          <p className="text-xs text-red-500 mt-1">
            ⚠ Log integrity check failed — entries may have been modified.
          </p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-3">
          {log.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No events recorded yet.</p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {log.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${eventColor(entry.event)}`}>
                      {EVENT_LABELS[entry.event] ?? entry.event}
                    </p>
                    {Object.keys(entry.details ?? {}).length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {Object.entries(entry.details)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                    {format(new Date(entry.timestamp), 'dd MMM HH:mm')}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="w-full h-9 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
          >
            <Trash2 className="w-3 h-3 mr-2" />
            {confirmClear ? 'Tap again to confirm clear' : 'Clear audit log'}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
