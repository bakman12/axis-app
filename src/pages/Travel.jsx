import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plane, Calendar, Package, Plus, Clock } from 'lucide-react';
import RootPageHeader from '../components/RootPageHeader';
import AddTripDialog from '../components/AddTripDialog';
import AddEventDialog from '../components/AddEventDialog';
import TripCard from '../components/TripCard';
import EventCard from '../components/EventCard';
import PackingCalculator from '../components/PackingCalculator';
import { AlertTriangle } from 'lucide-react';

export default function Travel() {
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const queryClient = useQueryClient();

  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => base44.entities.Trip.filter({ active: true }, '-start_date')
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.ImportantEvent.list('-date')
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: () => base44.entities.Medication.filter({ active: true })
  });

  // Get upcoming trips and events
  const today = new Date().toISOString().split('T')[0];
  const upcomingTrips = trips.filter(t => t.end_date >= today);
  const upcomingEvents = events.filter(e => e.date >= today);

  return (
    <div style={{ overscrollBehavior: 'none' }}>
      <RootPageHeader 
        title="Travel & Events" 
        subtitle="Smart planning for your medications"
      />
      
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        
        {/* Travel Safety Notice */}
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  Travel Medication Safety
                </p>
                <ul className="space-y-1 text-amber-800 dark:text-amber-200 ml-4 list-disc text-xs">
                  <li>Keep medications in original labeled containers</li>
                  <li>Carry prescriptions or a letter from your doctor when traveling internationally</li>
                  <li>Pack medications in carry-on luggage, not checked bags</li>
                  <li>For timezone changes affecting medication timing, consult your pharmacist BEFORE traveling</li>
                  <li>Pack extra doses in case of delays - our recommendations include a safety buffer</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setShowAddTrip(true)}
            className="h-16 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500"
          >
            <Plane className="w-5 h-5 mr-2" />
            Add Trip
          </Button>
          <Button
            onClick={() => setShowAddEvent(true)}
            className="h-16 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Add Event
          </Button>
        </div>

        {/* Packing Calculator */}
        {medications.length > 0 && (
          <PackingCalculator medications={medications} />
        )}

        {/* Upcoming Trips */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Plane className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Upcoming Trips
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Your travel plans with medication packing guidance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tripsLoading ? (
              <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
            ) : upcomingTrips.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Plane className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No upcoming trips</p>
                <p className="text-sm">Add a trip to get packing recommendations</p>
              </div>
            ) : (
              upcomingTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} medications={medications} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Important Events */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Important Events
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              High-stakes events with smart medication reminders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {eventsLoading ? (
              <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No upcoming events</p>
                <p className="text-sm">Add events to get smart reminders</p>
              </div>
            ) : (
              upcomingEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </CardContent>
        </Card>

      </div>

      <AddTripDialog open={showAddTrip} onOpenChange={setShowAddTrip} />
      <AddEventDialog open={showAddEvent} onOpenChange={setShowAddEvent} />
    </div>
  );
}