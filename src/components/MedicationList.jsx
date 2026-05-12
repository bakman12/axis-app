import React, { useState } from 'react';
import { entities } from '@/lib/encryptedBase44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Pencil, Pill, Pause, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import EditMedicationDialog from './EditMedicationDialog';
import { scheduleMedicationNotifications, cancelMedicationNotifications } from '@/lib/NotificationService';

export default function MedicationList({ medications, isLoading }) {
  const queryClient = useQueryClient();
  const [editingMed, setEditingMed] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Medication.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', 'all'] });
      toast.success('Medication removed');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (med) => entities.Medication.update(med.id, { active: !med.active }),
    onSuccess: (_, med) => {
      if (med.active) {
        cancelMedicationNotifications(med);
        toast.success(`${med.name} paused`);
      } else {
        scheduleMedicationNotifications({ ...med, active: true });
        toast.success(`${med.name} resumed`);
      }
      queryClient.invalidateQueries({ queryKey: ['medications', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (medications.length === 0) {
    return (
      <div className="text-center py-12">
        <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No medications added yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {medications.map(med => (
          <div
            key={med.id}
            className={`flex items-start justify-between p-4 rounded-lg transition-colors ${
              med.active === false
                ? 'bg-gray-100 dark:bg-gray-800/50 opacity-60'
                : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex gap-3 flex-1">
              {med.image_url && (
                <img
                  src={med.image_url}
                  alt={med.name}
                  className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className={`text-lg font-semibold dark:text-white ${med.active === false ? 'line-through' : ''}`}>{med.name}</h3>
                  {med.critical && (
                    <Badge className="bg-red-500 text-white">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Critical
                    </Badge>
                  )}
                  {med.active === false && (
                    <Badge className="bg-gray-400 text-white">Paused</Badge>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-1">{med.dosage}</p>
                {med.dosage_form && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{med.dosage_form}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {med.times?.map((time, idx) => (
                    <Badge key={idx} variant="outline" className="bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                      {time}
                    </Badge>
                  ))}
                </div>
                {med.notes && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{med.notes}</p>
                )}
              </div>
            </div>

            {/* Edit / Pause / Delete */}
            <div className="flex flex-col gap-1 ml-2">
              <Button variant="ghost" size="icon" onClick={() => setEditingMed(med)}
                className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => toggleActiveMutation.mutate(med)}
                className="text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                title={med.active === false ? 'Resume' : 'Pause'}>
                {med.active === false ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon"
                onClick={() => { if (confirm(`Remove ${med.name}?`)) deleteMutation.mutate(med.id); }}
                className="text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {editingMed && (
        <EditMedicationDialog
          medication={editingMed}
          open={!!editingMed}
          onClose={() => setEditingMed(null)}
        />
      )}
    </>
  );
}
