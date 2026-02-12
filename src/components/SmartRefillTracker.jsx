import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pill, MapPin, Clock, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import PharmacyFinder from './PharmacyFinder';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function SmartRefillTracker() {
  const [selectedMed, setSelectedMed] = useState(null);
  const [finderOpen, setFinderOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: () => base44.entities.Medication.filter({ active: true })
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['allMedicationLogs'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return await base44.entities.MedicationLog.list('-taken_time', 500);
    }
  });

  const { data: refillOrders = [] } = useQuery({
    queryKey: ['refillOrders'],
    queryFn: () => base44.entities.RefillOrder.list('-order_date', 50)
  });

  const { data: preferredPharmacy } = useQuery({
    queryKey: ['preferredPharmacy'],
    queryFn: async () => {
      const pharmacies = await base44.entities.Pharmacy.filter({ is_preferred: true });
      return pharmacies[0] || null;
    }
  });

  // Calculate smart refill estimates
  const calculateRefillNeeded = (medication) => {
    if (!medication.quantity_remaining) return null;

    // Get logs for this medication from last 30 days
    const medLogs = logs.filter(log => 
      log.medication_id === medication.id && 
      log.status === 'taken'
    );

    if (medLogs.length === 0) {
      // Fallback: use scheduled times
      const timesPerDay = medication.times?.length || 1;
      const daysRemaining = Math.floor(medication.quantity_remaining / timesPerDay);
      return {
        estimatedRunOutDate: addDays(new Date(), daysRemaining),
        daysRemaining,
        averagePerDay: timesPerDay,
        confidence: 'medium'
      };
    }

    // Calculate actual usage rate
    const daysWithLogs = new Set(medLogs.map(log => 
      log.taken_time?.split('T')[0]
    )).size;
    
    const averagePerDay = medLogs.length / Math.max(daysWithLogs, 1);
    const daysRemaining = Math.floor(medication.quantity_remaining / averagePerDay);
    
    return {
      estimatedRunOutDate: addDays(new Date(), daysRemaining),
      daysRemaining,
      averagePerDay: averagePerDay.toFixed(1),
      confidence: daysWithLogs >= 7 ? 'high' : 'medium'
    };
  };

  const medicationsWithRefills = medications.map(med => {
    const estimate = calculateRefillNeeded(med);
    const pendingOrder = refillOrders.find(order => 
      order.medication_id === med.id && 
      order.status === 'pending'
    );
    
    return {
      ...med,
      estimate,
      pendingOrder,
      needsRefill: estimate && estimate.daysRemaining <= (med.refill_reminder_days || 7)
    };
  }).filter(med => med.estimate);

  const urgentRefills = medicationsWithRefills.filter(med => med.needsRefill);

  const createRefillOrderMutation = useMutation({
    mutationFn: async ({ medication, pharmacy }) => {
      return await base44.entities.RefillOrder.create({
        medication_id: medication.id,
        medication_name: medication.name,
        pharmacy_id: pharmacy.id,
        pharmacy_name: pharmacy.name,
        quantity_requested: medication.times?.length * 30 || 30, // 30 days supply
        order_date: new Date().toISOString(),
        estimated_ready_date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
        status: 'pending',
        notes: 'Auto-generated smart refill order'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refillOrders'] });
      toast.success('Refill order created! Contact your pharmacy to confirm.');
      setFinderOpen(false);
      setSelectedMed(null);
    },
    onError: () => {
      toast.error('Failed to create refill order');
    }
  });

  const handleOrderRefill = (medication) => {
    if (!preferredPharmacy) {
      setSelectedMed(medication);
      setFinderOpen(true);
      toast.info('Please select a pharmacy first');
      return;
    }

    createRefillOrderMutation.mutate({
      medication,
      pharmacy: preferredPharmacy
    });
  };

  if (medicationsWithRefills.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              Smart Refill Tracker
            </div>
            {preferredPharmacy && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFinderOpen(true)}
                className="h-8"
              >
                <MapPin className="w-4 h-4 mr-1" />
                Change Pharmacy
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Preferred Pharmacy */}
          {preferredPharmacy ? (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm dark:text-white">{preferredPharmacy.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{preferredPharmacy.address}</p>
                  {preferredPharmacy.phone && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      📞 {preferredPharmacy.phone}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">Preferred</Badge>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFinderOpen(true)}
              className="w-full"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Set Preferred Pharmacy
            </Button>
          )}

          {/* Urgent Refills */}
          {urgentRefills.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                <AlertTriangle className="w-4 h-4" />
                Needs Attention ({urgentRefills.length})
              </div>
              {urgentRefills.map(med => (
                <div key={med.id} className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm dark:text-white">{med.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{med.dosage}</p>
                    </div>
                    {med.estimate.daysRemaining <= 3 && (
                      <Badge variant="destructive" className="text-xs">Urgent</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
                    <Clock className="w-3 h-3" />
                    <span>
                      {med.estimate.daysRemaining} days remaining
                      ({med.quantity_remaining} doses)
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Est. run out: {format(med.estimate.estimatedRunOutDate, 'MMM d, yyyy')}
                  </div>

                  {med.pendingOrder ? (
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Order Pending
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleOrderRefill(med)}
                      disabled={createRefillOrderMutation.isPending}
                      className="w-full mt-2 h-8"
                    >
                      <Pill className="w-4 h-4 mr-2" />
                      Order Refill
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* All Medications */}
          {medicationsWithRefills.length > urgentRefills.length && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium mb-2 text-gray-700 dark:text-gray-300">
                View All Medications ({medicationsWithRefills.length - urgentRefills.length} more)
              </summary>
              <div className="space-y-2 mt-2">
                {medicationsWithRefills
                  .filter(med => !med.needsRefill)
                  .map(med => (
                    <div key={med.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm dark:text-white">{med.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {med.quantity_remaining} doses • {med.estimate.daysRemaining} days
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Refill by: {format(addDays(med.estimate.estimatedRunOutDate, -(med.refill_reminder_days || 7)), 'MMM d')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20">
                          {med.estimate.daysRemaining}d
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </details>
          )}

          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-xs text-blue-900 dark:text-blue-200">
              💡 <strong>Smart Tracking:</strong> Refill dates are calculated based on your actual medication usage patterns for more accurate predictions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pharmacy Finder Dialog */}
      <Dialog open={finderOpen} onOpenChange={setFinderOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Find Nearby Pharmacies</DialogTitle>
            <DialogDescription>
              Search for pharmacies near you and set your preferred location
            </DialogDescription>
          </DialogHeader>
          <PharmacyFinder 
            selectedMedication={selectedMed}
            onPharmacySelected={(pharmacy) => {
              if (selectedMed) {
                createRefillOrderMutation.mutate({
                  medication: selectedMed,
                  pharmacy
                });
              } else {
                setFinderOpen(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}