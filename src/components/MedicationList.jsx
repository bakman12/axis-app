import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Pill, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MedicationList({ medications, isLoading }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Medication.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['medications']);
      toast.success('Medication removed');
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
    <div className="space-y-3">
      {medications.map(med => (
        <div
          key={med.id}
          className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
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
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">{med.name}</h3>
                {med.critical && (
                  <Badge className="bg-red-500 text-white">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Critical
                  </Badge>
                )}
              </div>
              <p className="text-gray-600 mb-1">{med.dosage}</p>
              {med.dosage_form && (
                <p className="text-sm text-gray-500 mb-2">{med.dosage_form}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {med.times.map((time, idx) => (
                  <Badge key={idx} variant="outline" className="bg-white">
                    {time}
                  </Badge>
                ))}
              </div>
              {med.notes && (
                <p className="text-sm text-gray-500 mt-2">{med.notes}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm(`Remove ${med.name}?`)) {
                deleteMutation.mutate(med.id);
              }
            }}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}