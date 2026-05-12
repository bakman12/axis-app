import { useState } from 'react';
import { entities } from '@/lib/encryptedBase44Client';
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
import { MobileSelect } from '@/components/ui/mobile-select';
import { toast } from 'sonner';

export default function AddEventDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    event_type: 'other',
    reminder_hours_before: 3,
    notes: ''
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => entities.ImportantEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event added successfully!');
      onOpenChange(false);
      setFormData({
        title: '',
        date: '',
        time: '',
        event_type: 'other',
        reminder_hours_before: 3,
        notes: ''
      });
    },
    onError: () => {
      toast.error('Failed to add event');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date) {
      toast.error('Please fill in all required fields');
      return;
    }
    createEventMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Add Important Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="dark:text-white">Event Name *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Job Interview"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date" className="dark:text-white">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="dark:text-white">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_type" className="dark:text-white">Event Type</Label>
            <MobileSelect
              value={formData.event_type}
              onValueChange={(value) => setFormData({ ...formData, event_type: value })}
              placeholder="Event type"
              options={[
                { value: 'meeting', label: 'Meeting' },
                { value: 'presentation', label: 'Presentation' },
                { value: 'flight', label: 'Flight' },
                { value: 'exam', label: 'Exam' },
                { value: 'wedding', label: 'Wedding' },
                { value: 'interview', label: 'Interview' },
                { value: 'sports', label: 'Sports Event' },
                { value: 'other', label: 'Other' }
              ]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder" className="dark:text-white">Medication Reminder</Label>
            <MobileSelect
              value={formData.reminder_hours_before.toString()}
              onValueChange={(value) => setFormData({ ...formData, reminder_hours_before: parseFloat(value) })}
              placeholder="Reminder timing"
              options={[
                { value: '1', label: '1 hour before' },
                { value: '2', label: '2 hours before' },
                { value: '3', label: '3 hours before' },
                { value: '4', label: '4 hours before' },
                { value: '6', label: '6 hours before' },
                { value: '12', label: '12 hours before' },
                { value: '24', label: '1 day before' }
              ]}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">AI will remind you to take meds before the event</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="dark:text-white">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Event details or reminders"
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
              disabled={createEventMutation.isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              Add Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}