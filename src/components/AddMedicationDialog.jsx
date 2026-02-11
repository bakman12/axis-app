import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Plus, X, Scan } from 'lucide-react';
import { toast } from 'sonner';
import BarcodeScanner from './BarcodeScanner';
import MedicationImageUpload from './MedicationImageUpload';
import MedicationDatabaseLookup from './MedicationDatabaseLookup';
import { AlertTriangle } from 'lucide-react';

export default function AddMedicationDialog({ open, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    times: ['08:00'],
    critical: false,
    notes: '',
    quantity_remaining: 30,
    refill_reminder_days: 7,
    barcode: '',
    image_url: '',
    dosage_form: '',
    manufacturer: ''
  });
  const [showScanner, setShowScanner] = useState(false);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Medication.create(data),
    onMutate: async (newMed) => {
      await queryClient.cancelQueries(['medications']);
      const previousMeds = queryClient.getQueryData(['medications']);
      queryClient.setQueryData(['medications'], (old = []) => [...old, { ...newMed, id: `temp-${Date.now()}` }]);
      return { previousMeds };
    },
    onError: (err, newMed, context) => {
      queryClient.setQueryData(['medications'], context.previousMeds);
      toast.error('Failed to add medication');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['medications']);
      toast.success('Medication added');
      onClose();
    }
  });

  const addTime = () => {
    setFormData({ ...formData, times: [...formData.times, '12:00'] });
  };

  const removeTime = (index) => {
    setFormData({
      ...formData,
      times: formData.times.filter((_, i) => i !== index)
    });
  };

  const updateTime = (index, value) => {
    const newTimes = [...formData.times];
    newTimes[index] = value;
    setFormData({ ...formData, times: newTimes });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.dosage || formData.times.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleBarcodeScanned = (result) => {
    setFormData({
      ...formData,
      barcode: result.barcode || '',
      name: result.medication_name || formData.name,
      dosage: result.dosage || formData.dosage
    });
    setShowScanner(false);
  };

  const handleMedicationFound = (result) => {
    setFormData({
      ...formData,
      name: result.name || formData.name,
      dosage_form: result.dosage_forms?.[0] || '',
      manufacturer: result.manufacturer || '',
      notes: result.instructions ? `${result.instructions}${result.warnings ? '\n\nWarnings: ' + result.warnings : ''}` : formData.notes
    });
  };

  const handleImageUploaded = (url) => {
    setFormData({ ...formData, image_url: url });
  };

  const handleImageRemoved = () => {
    setFormData({ ...formData, image_url: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700" style={{ overscrollBehavior: 'contain' }}>
        <DialogHeader>
          <DialogTitle className="dark:text-white">Add New Medication</DialogTitle>
        </DialogHeader>
        
        {/* Safety Notice */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Important:</strong> Only add medications prescribed by your doctor or recommended by your pharmacist. 
              Enter exactly as prescribed. For dosage questions, consult your healthcare provider.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Database Lookup */}
          <MedicationDatabaseLookup onMedicationFound={handleMedicationFound} />

          {/* Barcode Scanner */}
          {showScanner ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="dark:text-white">Scan Barcode</Label>
                <Button
                  type="button"
                  onClick={() => setShowScanner(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <BarcodeScanner 
                onBarcodeScanned={handleBarcodeScanned}
                onClose={() => setShowScanner(false)}
              />
            </div>
          ) : (
            <Button
              type="button"
              onClick={() => setShowScanner(true)}
              variant="outline"
              className="w-full h-11"
            >
              <Scan className="w-4 h-4 mr-2" />
              Scan Barcode
            </Button>
          )}

          {/* Medication Image */}
          <MedicationImageUpload
            imageUrl={formData.image_url}
            onImageUploaded={handleImageUploaded}
            onRemove={handleImageRemoved}
          />

          <div>
            <Label htmlFor="name" className="text-sm dark:text-white">Medication Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Hydrocortisone"
              className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="dosage" className="text-sm dark:text-white">Dosage *</Label>
            <Input
              id="dosage"
              value={formData.dosage}
              onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
              placeholder="e.g., 10mg"
              className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dosage_form" className="text-sm dark:text-white">Form</Label>
              <Input
                id="dosage_form"
                value={formData.dosage_form}
                onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })}
                placeholder="Tablet, Capsule..."
                className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="manufacturer" className="text-sm dark:text-white">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="Optional"
                className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="frequency" className="text-sm">Frequency</Label>
            <MobileSelect
              value={formData.frequency}
              onValueChange={(value) => {
                setFormData({ ...formData, frequency: value });
                // Auto-set default times based on frequency
                if (value === 'daily' && formData.times.length === 0) {
                  setFormData({ ...formData, frequency: value, times: ['08:00'] });
                } else if (value === 'twice_daily') {
                  setFormData({ ...formData, frequency: value, times: ['08:00', '20:00'] });
                } else if (value === 'three_times_daily') {
                  setFormData({ ...formData, frequency: value, times: ['08:00', '14:00', '20:00'] });
                } else if (value === 'four_times_daily') {
                  setFormData({ ...formData, frequency: value, times: ['08:00', '12:00', '16:00', '20:00'] });
                } else if (value === 'every_6_hours') {
                  setFormData({ ...formData, frequency: value, times: ['06:00', '12:00', '18:00', '00:00'] });
                } else if (value === 'every_8_hours') {
                  setFormData({ ...formData, frequency: value, times: ['08:00', '16:00', '00:00'] });
                } else if (value === 'every_12_hours') {
                  setFormData({ ...formData, frequency: value, times: ['08:00', '20:00'] });
                }
              }}
              placeholder="Select frequency"
              options={[
                { value: 'daily', label: 'Once daily' },
                { value: 'twice_daily', label: 'Twice daily' },
                { value: 'three_times_daily', label: 'Three times daily' },
                { value: 'four_times_daily', label: 'Four times daily' },
                { value: 'every_6_hours', label: 'Every 6 hours' },
                { value: 'every_8_hours', label: 'Every 8 hours' },
                { value: 'every_12_hours', label: 'Every 12 hours' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'as_needed', label: 'As needed' }
              ]}
            />
          </div>

          <div>
            <Label className="text-sm dark:text-white">Times *</Label>
            <div className="space-y-2 mt-2">
              {formData.times.map((time, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => updateTime(index, e.target.value)}
                    className="flex-1 h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {formData.times.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeTime(index)}
                      className="h-11 w-11 dark:bg-gray-700 dark:border-gray-600 select-none"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addTime}
                className="w-full h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white select-none"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Time
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg min-h-[44px]">
            <div>
              <Label htmlFor="critical" className="text-sm dark:text-white">Critical Medication</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Time-sensitive, requires immediate attention</p>
            </div>
            <Switch
              id="critical"
              checked={formData.critical}
              onCheckedChange={(checked) => setFormData({ ...formData, critical: checked })}
              className="select-none"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm dark:text-white">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Special instructions, take with food, etc."
              rows={3}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity" className="text-sm dark:text-white">Quantity Remaining</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity_remaining}
                onChange={(e) => setFormData({ ...formData, quantity_remaining: parseInt(e.target.value) || 0 })}
                placeholder="30"
                className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="refill_days" className="text-sm dark:text-white">Refill Reminder (days)</Label>
              <Input
                id="refill_days"
                type="number"
                value={formData.refill_reminder_days}
                onChange={(e) => setFormData({ ...formData, refill_reminder_days: parseInt(e.target.value) || 7 })}
                placeholder="7"
                className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white select-none">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 select-none">
              Add Medication
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}