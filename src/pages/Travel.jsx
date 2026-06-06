import { useState } from 'react';
import { entities } from '@/lib/encryptedBase44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plane, Calendar, Info } from 'lucide-react';
import RootPageHeader from '../components/RootPageHeader';
import AddTripDialog from '../components/AddTripDialog';
import AddEventDialog from '../components/AddEventDialog';
import TripCard from '../components/TripCard';
import EventCard from '../components/EventCard';
import PackingCalculator from '../components/PackingCalculator';
import ActiveTripSchedule from '../components/ActiveTripSchedule';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };
const sans  = { fontFamily: 'Inter, sans-serif' };

function SectionLabel({ children }) {
  return (
    <p style={{ ...sans, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: 14 }}>
      {children}
    </p>
  );
}

function ActionBtn({ icon: Icon, label, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...sans, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '20px 12px', background: accent ? 'hsl(var(--primary))' : 'hsl(var(--card))',
        color: accent ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
        border: accent ? 'none' : '1px solid hsl(var(--border))',
        borderRadius: 14, cursor: 'pointer', minHeight: 80,
      }}
    >
      <Icon style={{ width: 20, height: 20 }} />
      <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em' }}>{label}</span>
    </button>
  );
}

export default function Travel() {
  const [showAddTrip, setShowAddTrip]   = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);

  const { data: trips = [],       isLoading: tripsLoading }  = useQuery({ queryKey: ['trips'],       queryFn: () => entities.Trip.filter({ active: true }, '-start_date') });
  const { data: events = [],      isLoading: eventsLoading } = useQuery({ queryKey: ['events'],      queryFn: () => entities.ImportantEvent.list('-date') });
  const { data: medications = [] }                           = useQuery({ queryKey: ['medications'], queryFn: () => entities.Medication.filter({ active: true }) });

  const today         = new Date().toISOString().split('T')[0];
  const upcomingTrips  = trips.filter(t => t.end_date >= today);
  const upcomingEvents = events.filter(e => e.date >= today);
  const activeTrip     = trips.find(t => t.start_date <= today && t.end_date >= today) ?? null;

  return (
    <div style={{ overscrollBehavior: 'none', background: 'hsl(var(--background))', minHeight: '100vh' }}>
      <RootPageHeader title="Travel" subtitle="Smart packing & timezone planning" />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 96px' }}>

        {/* Travel safety notice */}
        <div style={{ display: 'flex', gap: 12, padding: '14px 16px', background: 'rgba(199,91,58,0.06)', border: '1px solid rgba(199,91,58,0.2)', borderRadius: 14, marginBottom: 24 }}>
          <Info style={{ width: 16, height: 16, color: 'hsl(var(--primary))', flexShrink: 0, marginTop: 2 }} />
          <div style={{ ...sans, fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.6 }}>
            <p style={{ fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 6 }}>Before you travel</p>
            <ul style={{ paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Keep medications in original labeled containers</li>
              <li>Carry prescriptions or a GP letter for international travel</li>
              <li>Pack medications in carry-on luggage, not checked bags</li>
              <li>Consult your pharmacist about timezone dose adjustments</li>
            </ul>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          <ActionBtn icon={Plane}    label="Add Trip"  onClick={() => setShowAddTrip(true)}  accent />
          <ActionBtn icon={Calendar} label="Add Event" onClick={() => setShowAddEvent(true)} />
        </div>

        {/* Active trip */}
        {activeTrip && (
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>Active Trip</SectionLabel>
            <ActiveTripSchedule trip={activeTrip} medications={medications} />
          </div>
        )}

        {/* Packing calculator */}
        {medications.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>Packing Calculator</SectionLabel>
            <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, overflow: 'hidden' }}>
              <PackingCalculator medications={medications} />
            </div>
          </div>
        )}

        {/* Upcoming trips */}
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Upcoming Trips</SectionLabel>
          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, overflow: 'hidden' }}>
            {tripsLoading ? (
              <div style={{ height: 80, background: 'hsl(var(--muted))', margin: 12, borderRadius: 10 }} />
            ) : upcomingTrips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                <Plane style={{ width: 28, height: 28, margin: '0 auto 10px', color: 'hsl(var(--muted-foreground))', opacity: 0.4 }} />
                <p style={{ ...serif, fontSize: '1rem', color: 'hsl(var(--foreground))', opacity: 0.4 }}>No upcoming trips</p>
                <p style={{ ...sans, fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>Add a trip to get packing recommendations</p>
              </div>
            ) : (
              <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {upcomingTrips.map(trip => (
                  <TripCard key={trip.id} trip={trip} medications={medications} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Important events */}
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Important Events</SectionLabel>
          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, overflow: 'hidden' }}>
            {eventsLoading ? (
              <div style={{ height: 80, background: 'hsl(var(--muted))', margin: 12, borderRadius: 10 }} />
            ) : upcomingEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                <Calendar style={{ width: 28, height: 28, margin: '0 auto 10px', color: 'hsl(var(--muted-foreground))', opacity: 0.4 }} />
                <p style={{ ...serif, fontSize: '1rem', color: 'hsl(var(--foreground))', opacity: 0.4 }}>No upcoming events</p>
                <p style={{ ...sans, fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>Add events to get smart reminders</p>
              </div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {upcomingEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <AddTripDialog  open={showAddTrip}  onOpenChange={setShowAddTrip} />
      <AddEventDialog open={showAddEvent} onOpenChange={setShowAddEvent} />
    </div>
  );
}
