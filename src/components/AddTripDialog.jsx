import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function AddTripDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    timezone_offset: 0,
    notes: ''
  });

  const createTripMutation = useMutation({
    mutationFn: (data) => base44.entities.Trip.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trip added successfully!');
      onOpenChange(false);
      setFormData({
        destination: '',
        start_date: '',
        end_date: '',
        timezone_offset: 0,
        notes: ''
      });
    },
    onError: () => {
      toast.error('Failed to add trip');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.destination || !formData.start_date || !formData.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    createTripMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Add New Trip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="destination" className="dark:text-white">Destination *</Label>
            <Input
              id="destination"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              placeholder="e.g., Paris, France"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="dark:text-white">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className="dark:text-white">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone_offset" className="dark:text-white">Time Zone Difference</Label>
            <Input
              id="timezone_offset"
              type="number"
              value={formData.timezone_offset}
              onChange={(e) => setFormData({ ...formData, timezone_offset: parseFloat(e.target.value) || 0 })}
              placeholder="e.g., +5 or -3"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Hours ahead (+) or behind (-) your home timezone</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="dark:text-white">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Travel reminders, accommodation details, etc."
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTripMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Add Trip
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}