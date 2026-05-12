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
import { toast } from 'sonner';

// ── Offline timezone lookup ───────────────────────────────────────────────────
// Maps city/country keywords to IANA timezone IDs.
// Matching is keyword-in-destination or destination-in-keyword (case-insensitive).
// Longer keyword wins so "new york" beats "york".
const TIMEZONE_DB = [
  // UK & Ireland
  { terms: ['london','england','wales','scotland','uk','united kingdom','birmingham','manchester','glasgow','edinburgh','leeds','sheffield','bristol','liverpool'], tz: 'Europe/London' },
  { terms: ['dublin','ireland'], tz: 'Europe/Dublin' },
  { terms: ['reykjavik','iceland'], tz: 'Atlantic/Reykjavik' },
  // Western Europe
  { terms: ['paris','france','lyon','marseille','nice','bordeaux'], tz: 'Europe/Paris' },
  { terms: ['berlin','germany','munich','hamburg','frankfurt','cologne'], tz: 'Europe/Berlin' },
  { terms: ['madrid','spain','barcelona','seville','valencia','bilbao'], tz: 'Europe/Madrid' },
  { terms: ['rome','italy','milan','naples','florence','venice','turin'], tz: 'Europe/Rome' },
  { terms: ['amsterdam','netherlands','rotterdam'], tz: 'Europe/Amsterdam' },
  { terms: ['brussels','belgium','bruges','antwerp'], tz: 'Europe/Brussels' },
  { terms: ['vienna','austria','salzburg','innsbruck'], tz: 'Europe/Vienna' },
  { terms: ['zurich','switzerland','geneva','bern','basel'], tz: 'Europe/Zurich' },
  { terms: ['lisbon','portugal','porto'], tz: 'Europe/Lisbon' },
  // Scandinavia
  { terms: ['stockholm','sweden','gothenburg'], tz: 'Europe/Stockholm' },
  { terms: ['oslo','norway','bergen'], tz: 'Europe/Oslo' },
  { terms: ['copenhagen','denmark'], tz: 'Europe/Copenhagen' },
  { terms: ['helsinki','finland','tampere'], tz: 'Europe/Helsinki' },
  // Eastern Europe
  { terms: ['warsaw','poland','krakow','wroclaw'], tz: 'Europe/Warsaw' },
  { terms: ['prague','czech','czechia','brno'], tz: 'Europe/Prague' },
  { terms: ['budapest','hungary'], tz: 'Europe/Budapest' },
  { terms: ['bucharest','romania','cluj'], tz: 'Europe/Bucharest' },
  { terms: ['athens','greece','thessaloniki'], tz: 'Europe/Athens' },
  { terms: ['istanbul','turkey','ankara','izmir'], tz: 'Europe/Istanbul' },
  { terms: ['moscow','russia','saint petersburg'], tz: 'Europe/Moscow' },
  { terms: ['kyiv','kiev','ukraine'], tz: 'Europe/Kiev' },
  // Americas — East
  { terms: ['new york','nyc','manhattan','brooklyn','new jersey','philadelphia','boston','miami','washington dc','washington d.c','atlanta','toronto','montreal','ottawa'], tz: 'America/New_York' },
  { terms: ['chicago','detroit','cleveland','indianapolis','nashville','milwaukee'], tz: 'America/Chicago' },
  { terms: ['denver','colorado','salt lake','boise'], tz: 'America/Denver' },
  { terms: ['phoenix','arizona','tucson'], tz: 'America/Phoenix' },
  { terms: ['los angeles','san francisco','seattle','portland','las vegas','san diego','california','nevada','vancouver'], tz: 'America/Los_Angeles' },
  { terms: ['mexico city','mexico','guadalajara','monterrey'], tz: 'America/Mexico_City' },
  { terms: ['cancun'], tz: 'America/Cancun' },
  { terms: ['bogota','colombia'], tz: 'America/Bogota' },
  { terms: ['lima','peru'], tz: 'America/Lima' },
  { terms: ['santiago','chile'], tz: 'America/Santiago' },
  { terms: ['sao paulo','são paulo','rio de janeiro','rio','brazil','brasil','brasilia'], tz: 'America/Sao_Paulo' },
  { terms: ['buenos aires','argentina'], tz: 'America/Argentina/Buenos_Aires' },
  { terms: ['caracas','venezuela'], tz: 'America/Caracas' },
  { terms: ['honolulu','hawaii'], tz: 'Pacific/Honolulu' },
  // Middle East
  { terms: ['dubai','abu dhabi','uae','united arab emirates'], tz: 'Asia/Dubai' },
  { terms: ['riyadh','saudi arabia','jeddah','mecca','medina'], tz: 'Asia/Riyadh' },
  { terms: ['doha','qatar'], tz: 'Asia/Qatar' },
  { terms: ['kuwait'], tz: 'Asia/Kuwait' },
  { terms: ['muscat','oman'], tz: 'Asia/Muscat' },
  { terms: ['beirut','lebanon'], tz: 'Asia/Beirut' },
  { terms: ['amman','jordan'], tz: 'Asia/Amman' },
  { terms: ['tel aviv','jerusalem','israel'], tz: 'Asia/Jerusalem' },
  { terms: ['baghdad','iraq'], tz: 'Asia/Baghdad' },
  { terms: ['tehran','iran'], tz: 'Asia/Tehran' },
  // Africa
  { terms: ['cairo','egypt'], tz: 'Africa/Cairo' },
  { terms: ['nairobi','kenya'], tz: 'Africa/Nairobi' },
  { terms: ['lagos','nigeria','abuja'], tz: 'Africa/Lagos' },
  { terms: ['johannesburg','cape town','south africa','durban','pretoria'], tz: 'Africa/Johannesburg' },
  { terms: ['accra','ghana'], tz: 'Africa/Accra' },
  { terms: ['addis ababa','ethiopia'], tz: 'Africa/Addis_Ababa' },
  { terms: ['casablanca','morocco','rabat'], tz: 'Africa/Casablanca' },
  { terms: ['tunis','tunisia'], tz: 'Africa/Tunis' },
  { terms: ['algiers','algeria'], tz: 'Africa/Algiers' },
  { terms: ['dar es salaam','tanzania'], tz: 'Africa/Dar_es_Salaam' },
  // South & East Asia
  { terms: ['mumbai','delhi','new delhi','bangalore','bengaluru','india','hyderabad','chennai','kolkata','pune'], tz: 'Asia/Kolkata' },
  { terms: ['karachi','lahore','islamabad','pakistan'], tz: 'Asia/Karachi' },
  { terms: ['dhaka','bangladesh'], tz: 'Asia/Dhaka' },
  { terms: ['colombo','sri lanka'], tz: 'Asia/Colombo' },
  { terms: ['kathmandu','nepal'], tz: 'Asia/Kathmandu' },
  { terms: ['yangon','myanmar','burma'], tz: 'Asia/Rangoon' },
  { terms: ['bangkok','thailand','chiang mai','phuket'], tz: 'Asia/Bangkok' },
  { terms: ['ho chi minh','saigon','hanoi','vietnam'], tz: 'Asia/Ho_Chi_Minh' },
  { terms: ['jakarta','bali','surabaya','indonesia'], tz: 'Asia/Jakarta' },
  { terms: ['kuala lumpur','malaysia','penang'], tz: 'Asia/Kuala_Lumpur' },
  { terms: ['singapore'], tz: 'Asia/Singapore' },
  { terms: ['manila','philippines','cebu'], tz: 'Asia/Manila' },
  { terms: ['hong kong'], tz: 'Asia/Hong_Kong' },
  { terms: ['taipei','taiwan'], tz: 'Asia/Taipei' },
  { terms: ['beijing','shanghai','shenzhen','guangzhou','china','chengdu','wuhan'], tz: 'Asia/Shanghai' },
  { terms: ['seoul','busan','korea'], tz: 'Asia/Seoul' },
  { terms: ['tokyo','osaka','kyoto','sapporo','japan'], tz: 'Asia/Tokyo' },
  { terms: ['tashkent','uzbekistan'], tz: 'Asia/Tashkent' },
  { terms: ['almaty','kazakhstan'], tz: 'Asia/Almaty' },
  // Oceania
  { terms: ['sydney','melbourne','brisbane','australia','adelaide','canberra'], tz: 'Australia/Sydney' },
  { terms: ['perth','western australia'], tz: 'Australia/Perth' },
  { terms: ['auckland','wellington','new zealand','christchurch'], tz: 'Pacific/Auckland' },
  { terms: ['fiji'], tz: 'Pacific/Fiji' },
];

// Returns the UTC offset in hours for an IANA timezone at the current moment (DST-aware).
function getUTCOffsetHours(ianaTimezone) {
  const now = new Date();
  const tzStr = new Intl.DateTimeFormat('en', {
    timeZone: ianaTimezone,
    timeZoneName: 'shortOffset',
  }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value ?? 'GMT+0';

  const match = tzStr.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!match) return 0;
  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3] ?? '0', 10);
  return sign * (hours + minutes / 60);
}

// Returns the offset in hours between destination and London, or null if unknown.
function lookupTimezoneOffset(destination) {
  if (!destination || destination.length < 2) return null;
  const q = destination.toLowerCase();

  let best = null;
  let bestScore = 0;

  for (const entry of TIMEZONE_DB) {
    for (const term of entry.terms) {
      if (q.includes(term) || term.includes(q)) {
        if (term.length > bestScore) {
          bestScore = term.length;
          best = entry;
        }
      }
    }
  }

  if (!best) return null;

  const londonOffset = getUTCOffsetHours('Europe/London');
  const destOffset = getUTCOffsetHours(best.tz);
  return Math.round((destOffset - londonOffset) * 2) / 2; // round to nearest 0.5h
}
// ─────────────────────────────────────────────────────────────────────────────

export default function AddTripDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    timezone_offset: 0,
    notes: ''
  });
  const [calculatingTimezone, setCalculatingTimezone] = useState(false);

  const createTripMutation = useMutation({
    mutationFn: (data) => entities.Trip.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trip added successfully!');
      onOpenChange(false);
      setFormData({ destination: '', start_date: '', end_date: '', timezone_offset: 0, notes: '' });
    },
    onError: () => {
      toast.error('Failed to add trip');
    }
  });

  const calculateTimezone = (destination) => {
    if (!destination || destination.length < 3) return;
    setCalculatingTimezone(true);
    const offset = lookupTimezoneOffset(destination);
    if (offset !== null) {
      setFormData(prev => ({ ...prev, timezone_offset: offset }));
      toast.success(`Timezone: ${offset > 0 ? '+' : ''}${offset}h from London`);
    } else {
      toast.error('Destination not recognised — enter timezone offset manually');
    }
    setCalculatingTimezone(false);
  };

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
            <div className="flex gap-2">
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="e.g., Paris, France"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <Button
                type="button"
                onClick={() => calculateTimezone(formData.destination)}
                disabled={!formData.destination || calculatingTimezone}
                className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
              >
                Auto TZ
              </Button>
            </div>
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
            <Label htmlFor="timezone_offset" className="dark:text-white">Time Zone Difference (from London)</Label>
            <Input
              id="timezone_offset"
              type="number"
              step="0.5"
              value={formData.timezone_offset}
              onChange={(e) => setFormData({ ...formData, timezone_offset: parseFloat(e.target.value) || 0 })}
              placeholder="e.g., +5 or -3"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Click "Auto TZ" to detect, or enter manually</p>
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
