import { entities } from '@/lib/encryptedBase44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Clock, Package, Trash2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export default function TripCard({ trip, medications }) {
  const queryClient = useQueryClient();

  const deleteTripMutation = useMutation({
    mutationFn: (id) => entities.Trip.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trip deleted');
    }
  });

  // Calculate trip duration
  const duration = differenceInDays(new Date(trip.end_date), new Date(trip.start_date)) + 1;
  
  // Calculate packing needs
  const packingList = medications.map(med => {
    let dosesPerDay = 1;
    if (med.frequency === 'twice_daily') dosesPerDay = 2;
    if (med.frequency === 'three_times_daily') dosesPerDay = 3;
    if (med.frequency === 'weekly') dosesPerDay = 1 / 7;

    const neededDoses = Math.ceil(dosesPerDay * duration);
    const recommendedDoses = Math.ceil(neededDoses * 1.2); // 20% buffer

    return {
      name: med.name,
      needed: neededDoses,
      recommended: recommendedDoses
    };
  });

  const daysUntil = differenceInDays(new Date(trip.start_date), new Date());
  const isUpcoming = daysUntil >= 0;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold dark:text-white">{trip.destination}</h3>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(trip.start_date), 'MMM d')} - {format(new Date(trip.end_date), 'MMM d')}
              </span>
              <span>({duration} days)</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteTripMutation.mutate(trip.id)}
            className="text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {trip.timezone_offset !== 0 && (
          <div className="flex items-center gap-2 mb-3 text-sm">
            <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-gray-700 dark:text-gray-300">
              Time zone: {trip.timezone_offset > 0 ? '+' : ''}{trip.timezone_offset} hours
            </span>
          </div>
        )}

        {isUpcoming && daysUntil <= 7 && (
          <Badge className="mb-3 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {daysUntil === 0 ? 'Today!' : `In ${daysUntil} day${daysUntil > 1 ? 's' : ''}`}
          </Badge>
        )}

        {/* Packing List */}
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="font-medium text-sm dark:text-white">Packing Guide (Estimates Only)</span>
          </div>
          <div className="space-y-2">
            {packingList.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400">{item.needed} needed</span>
                  <Badge variant="outline" className="dark:border-gray-500 dark:text-gray-300">
                    Pack {item.recommended}
                  </Badge>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              💡 Estimates include 20% buffer. Always verify quantities with your pharmacist, especially for international travel or timezone changes.
            </p>
          </div>
        </div>

        {trip.notes && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 italic">
            {trip.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}