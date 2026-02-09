import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, CheckCircle } from 'lucide-react';
import { differenceInDays, addDays, format } from 'date-fns';
import { toast } from 'sonner';

export default function RefillReminders({ medications }) {
  const queryClient = useQueryClient();

  const markRefilledMutation = useMutation({
    mutationFn: ({ id, quantity }) => 
      base44.entities.Medication.update(id, {
        quantity_remaining: quantity,
        last_refill_date: format(new Date(), 'yyyy-MM-dd')
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['medications']);
      toast.success('Refill recorded');
    }
  });

  const calculateDaysRemaining = (med) => {
    if (!med.quantity_remaining) return null;
    
    // Calculate daily usage
    const dosesPerDay = med.times?.length || 1;
    const daysRemaining = Math.floor(med.quantity_remaining / dosesPerDay);
    
    return daysRemaining;
  };

  const needsRefill = medications
    .filter(med => {
      const days = calculateDaysRemaining(med);
      return days !== null && days <= (med.refill_reminder_days || 7);
    })
    .sort((a, b) => calculateDaysRemaining(a) - calculateDaysRemaining(b));

  const upcomingRefills = medications
    .filter(med => {
      const days = calculateDaysRemaining(med);
      return days !== null && days > (med.refill_reminder_days || 7) && days <= 30;
    });

  if (needsRefill.length === 0 && upcomingRefills.length === 0) {
    return (
      <Card className="shadow-md border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-green-500" />
            Refill Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">All medications well stocked</p>
            <p className="text-sm text-gray-500 mt-1">No refills needed soon</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-l-4 border-l-orange-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-500" />
          Refill Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {needsRefill.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="font-semibold text-gray-900">Needs Attention</p>
            </div>
            <div className="space-y-3">
              {needsRefill.map(med => {
                const days = calculateDaysRemaining(med);
                return (
                  <div
                    key={med.id}
                    className="p-4 bg-red-50 border-2 border-red-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{med.name}</p>
                          {med.critical && (
                            <Badge className="bg-red-600 text-white text-xs">
                              CRITICAL
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {med.quantity_remaining} doses remaining
                        </p>
                        <Badge className="bg-red-600 text-white">
                          {days === 0 ? 'Out today!' : days === 1 ? '1 day left' : `${days} days left`}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const quantity = prompt(`How many doses did you refill for ${med.name}?`, '30');
                          if (quantity && !isNaN(quantity)) {
                            markRefilledMutation.mutate({ id: med.id, quantity: parseInt(quantity) });
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Mark Refilled
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {upcomingRefills.length > 0 && (
          <div>
            <p className="font-semibold text-gray-900 mb-3">Upcoming Refills</p>
            <div className="space-y-2">
              {upcomingRefills.map(med => {
                const days = calculateDaysRemaining(med);
                return (
                  <div
                    key={med.id}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{med.name}</p>
                        <p className="text-sm text-gray-600">
                          {med.quantity_remaining} doses - {days} days remaining
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-white">
                        {days} days
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}