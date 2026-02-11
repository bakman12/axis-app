import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MobileSelect } from '@/components/ui/mobile-select';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function LogDoseDialog({ open, onClose, medication, scheduledTime }) {
  const [status, setStatus] = useState('taken');
  const [doseAmount, setDoseAmount] = useState('1.0');
  const [context, setContext] = useState('');
  const queryClient = useQueryClient();

  const logMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['medicationLogs']);
      queryClient.invalidateQueries(['achievements']);
      toast.success('Dose logged successfully');
      onClose();
      resetForm();
    }
  });

  const resetForm = () => {
    setStatus('taken');
    setDoseAmount('1.0');
    setContext('');
  };

  const handleSubmit = () => {
    const now = new Date();
    const scheduledDateTime = new Date(`${format(now, 'yyyy-MM-dd')} ${scheduledTime}`);
    const delayMinutes = Math.round((now - scheduledDateTime) / 1000 / 60);

    logMutation.mutate({
      medication_id: medication.id,
      medication_name: medication.name,
      scheduled_time: scheduledTime,
      taken_time: now.toISOString(),
      status: parseFloat(doseAmount) < 1.0 ? 'partial' : status,
      dose_amount: parseFloat(doseAmount),
      delay_minutes: delayMinutes > 0 ? delayMinutes : 0,
      context: context || undefined
    });
  };

  if (!medication) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Dose</DialogTitle>
          <DialogDescription>
            {medication.name} - {medication.dosage}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Selection */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={status === 'taken' ? 'default' : 'outline'}
              onClick={() => setStatus('taken')}
              className="flex flex-col gap-1 h-auto py-3"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-xs">Taken</span>
            </Button>
            <Button
              variant={status === 'delayed' ? 'default' : 'outline'}
              onClick={() => setStatus('delayed')}
              className="flex flex-col gap-1 h-auto py-3"
            >
              <Clock className="w-5 h-5" />
              <span className="text-xs">Delayed</span>
            </Button>
            <Button
              variant={status === 'missed' ? 'destructive' : 'outline'}
              onClick={() => setStatus('missed')}
              className="flex flex-col gap-1 h-auto py-3"
            >
              <XCircle className="w-5 h-5" />
              <span className="text-xs">Missed</span>
            </Button>
          </div>

          {/* Dose Amount */}
          {status !== 'missed' && (
            <div className="space-y-2">
              <Label>Dose Amount</Label>
              <MobileSelect
                value={doseAmount}
                onValueChange={setDoseAmount}
                placeholder="Select dose"
                options={[
                  { value: '1.0', label: 'Full dose (100%)' },
                  { value: '0.75', label: 'Three-quarters (75%)' },
                  { value: '0.5', label: 'Half dose (50%)' },
                  { value: '0.25', label: 'Quarter dose (25%)' }
                ]}
              />
            </div>
          )}

          {/* Context Notes */}
          <div className="space-y-2">
            <Label htmlFor="context">Notes (Optional)</Label>
            <Textarea
              id="context"
              placeholder="Add context (e.g., 'took with food', 'felt nauseous')"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={logMutation.isPending}>
              Log Dose
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}