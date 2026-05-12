import React, { useState, useMemo } from 'react';
import { entities } from '@/lib/encryptedBase44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cancelMedicationNotifications, scheduleMedicationNotifications } from '@/lib/NotificationService';
import { logAuditEvent, AUDIT } from '@/lib/auditLog';
import { checkInteractions, severityStyles } from '@/lib/drugInteractions';
import MedicationImageUpload from './MedicationImageUpload';

export default function EditMedicationDialog({ medication, open, onClose }) {
  const [formData, setFormData] = useState({
    name:                 medication?.name ?? '',
    dosage:               medication?.dosage ?? '',
    frequency:            medication?.frequency ?? 'daily',
    times:                medication?.times ?? ['08:00'],
    critical:             medication?.critical ?? false,
    active:               medication?.active ?? true,
    notes:                medication?.notes ?? '',
    quantity_remaining:   medication?.quantity_remaining ?? 30,
    refill_reminder_days: medication?.refill_reminder_days ?? 7,
    barcode:              medication?.barcode ?? '',
    image_url:            medication?.image_url ?? '',
    dosage_form:          medication?.dosage_form ?? '',
    manufacturer:         medication?.manufacturer ?? '',
  });

  const queryClient = useQueryClient();

  // Fetch other active meds to check interactions as user edits the name
  const { data: allMeds = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: () => entities.Medication.filter({ active: true }),
  });
  const otherMeds = allMeds.filter(m => m.id !== medication?.id);
  const interactions = useMemo(
    () => checkInteractions(formData.name, otherMeds),
    [formData.name, otherMeds]
  );

  const updateMutation = useMutation({
    mutationFn: (data) => entities.Medication.update(medication.id, data),
    onSuccess: (updated) => {
      cancelMedicationNotifications(medication);
      scheduleMedicationNotifications(/** @type {any} */ (updated));
      logAuditEvent(AUDIT.MEDICATION_UPDATED, { name: formData.name });
      queryClient.invalidateQueries(['medications']);
      toast.success('Medication updated');
      onClose();
    },
    onError: () => toast.error('Failed to update medication'),
  });

  const addTime = () => setFormData({ ...formData, times: [...formData.times, '12:00'] });
  const removeTime = (i) => setFormData({ ...formData, times: formData.times.filter((_, idx) => idx !== i) });
  const updateTime = (i, v) => {
    const t = [...formData.times];
    t[i] = v;
    setFormData({ ...formData, times: t });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.dosage || formData.times.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700" style={{ overscrollBehavior: 'contain' }}>
        <DialogHeader>
          <DialogTitle className="dark:text-white">Edit Medication</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <MedicationImageUpload
            imageUrl={formData.image_url}
            onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
            onRemove={() => setFormData({ ...formData, image_url: '' })}
          />

          <div>
            <Label htmlFor="edit-name" className="text-sm dark:text-white">Medication Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-dosage" className="text-sm dark:text-white">Dosage *</Label>
            <Input
              id="edit-dosage"
              value={formData.dosage}
              onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
              className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm dark:text-white">Form</Label>
              <Input
                value={formData.dosage_form}
                onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })}
                placeholder="Tablet, Capsule..."
                className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label className="text-sm dark:text-white">Manufacturer</Label>
              <Input
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="Optional"
                className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm">Frequency</Label>
            <MobileSelect
              value={formData.frequency}
              onValueChange={(value) => {
                const presets = {
                  twice_daily:       ['08:00', '20:00'],
                  three_times_daily: ['08:00', '14:00', '20:00'],
                  four_times_daily:  ['08:00', '12:00', '16:00', '20:00'],
                  every_6_hours:     ['06:00', '12:00', '18:00', '00:00'],
                  every_8_hours:     ['08:00', '16:00', '00:00'],
                  every_12_hours:    ['08:00', '20:00'],
                };
                setFormData({ ...formData, frequency: value, ...(presets[value] ? { times: presets[value] } : {}) });
              }}
              options={[
                { value: 'daily',             label: 'Once daily' },
                { value: 'twice_daily',        label: 'Twice daily' },
                { value: 'three_times_daily',  label: 'Three times daily' },
                { value: 'four_times_daily',   label: 'Four times daily' },
                { value: 'every_6_hours',      label: 'Every 6 hours' },
                { value: 'every_8_hours',      label: 'Every 8 hours' },
                { value: 'every_12_hours',     label: 'Every 12 hours' },
                { value: 'weekly',             label: 'Weekly' },
                { value: 'as_needed',          label: 'As needed' },
              ]}
            />
          </div>

          <div>
            <Label className="text-sm dark:text-white">Times *</Label>
            <div className="space-y-2 mt-2">
              {formData.times.map((time, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => updateTime(i, e.target.value)}
                    className="flex-1 h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {formData.times.length > 1 && (
                    <Button type="button" variant="outline" size="icon" onClick={() => removeTime(i)}
                      className="h-11 w-11 dark:bg-gray-700 dark:border-gray-600 select-none">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addTime}
                className="w-full h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white select-none">
                <Plus className="w-4 h-4 mr-2" />
                Add Time
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg min-h-[44px]">
            <div>
              <Label className="text-sm dark:text-white">Critical Medication</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Time-sensitive, requires immediate attention</p>
            </div>
            <Switch
              checked={formData.critical}
              onCheckedChange={(v) => setFormData({ ...formData, critical: v })}
              className="select-none"
            />
          </div>

          <div>
            <Label className="text-sm dark:text-white">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Special instructions, take with food, etc."
              rows={3}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm dark:text-white">Quantity Remaining</Label>
              <Input
                type="number"
                value={formData.quantity_remaining}
                onChange={(e) => setFormData({ ...formData, quantity_remaining: parseInt(e.target.value) || 0 })}
                className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label className="text-sm dark:text-white">Refill Reminder (days)</Label>
              <Input
                type="number"
                value={formData.refill_reminder_days}
                onChange={(e) => setFormData({ ...formData, refill_reminder_days: parseInt(e.target.value) || 7 })}
                className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          {/* Drug interaction warnings */}
          {interactions.length > 0 && (
            <div className="space-y-2">
              {interactions.map((/** @type {any} */ w, i) => {
                const styles = severityStyles(w.severity);
                return (
                  <div key={i} className={`rounded-lg p-3 border ${styles.bg} ${styles.border}`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${styles.text}`} />
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${styles.badge}`}>{w.severity}</span>
                          <span className={`text-xs font-semibold ${styles.text}`}>{w.drug1} + {w.drug2}</span>
                        </div>
                        <p className={`text-xs ${styles.text}`}>{w.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}
              className="flex-1 h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white select-none">
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}
              className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 select-none">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
