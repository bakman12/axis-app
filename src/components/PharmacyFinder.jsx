import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Clock, Star, Search, Loader2, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default marker icon issue
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function PharmacyFinder({ selectedMedication, onPharmacySelected }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const queryClient = useQueryClient();

  const { data: savedPharmacies = [] } = useQuery({
    queryKey: ['pharmacies'],
    queryFn: () => base44.entities.Pharmacy.list('-created_date')
  });

  const setPreferredMutation = useMutation({
    mutationFn: async (pharmacyId) => {
      // Unset all others first
      const updates = savedPharmacies.map(p => 
        base44.entities.Pharmacy.update(p.id, { is_preferred: false })
      );
      await Promise.all(updates);
      
      // Set the selected one
      await base44.entities.Pharmacy.update(pharmacyId, { is_preferred: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacies'] });
      queryClient.invalidateQueries({ queryKey: ['preferredPharmacy'] });
      toast.success('Preferred pharmacy updated');
    }
  });

  const savePharmacyMutation = useMutation({
    mutationFn: async (pharmacy) => {
      return await base44.entities.Pharmacy.create(pharmacy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacies'] });
      toast.success('Pharmacy saved');
    }
  });

  const getUserLocation = () => {
    setIsLoadingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsLoadingLocation(false);
          toast.success('Location found');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Could not get your location');
          setIsLoadingLocation(false);
        }
      );
    } else {
      toast.error('Geolocation not supported');
      setIsLoadingLocation(false);
    }
  };

  const searchNearbyPharmacies = async () => {
    if (!userLocation) {
      toast.error('Please enable location first');
      return;
    }

    // Mock pharmacy data - in a real app, this would call a pharmacy API
    const mockPharmacies = [
      {
        name: 'Boots Pharmacy',
        address: '123 High Street, London',
        phone: '020 1234 5678',
        hours: 'Mon-Sat: 9am-6pm, Sun: 10am-4pm',
        latitude: userLocation.lat + 0.01,
        longitude: userLocation.lng + 0.01,
        distance: 0.8
      },
      {
        name: 'Superdrug Pharmacy',
        address: '456 Main Road, London',
        phone: '020 8765 4321',
        hours: 'Mon-Fri: 8am-7pm, Sat-Sun: 9am-5pm',
        latitude: userLocation.lat - 0.01,
        longitude: userLocation.lng - 0.01,
        distance: 1.2
      },
      {
        name: 'Lloyds Pharmacy',
        address: '789 Church Street, London',
        phone: '020 5555 7777',
        hours: 'Mon-Sat: 9am-6pm',
        latitude: userLocation.lat + 0.015,
        longitude: userLocation.lng - 0.01,
        distance: 1.5
      }
    ];

    return mockPharmacies;
  };

  const [nearbyPharmacies, setNearbyPharmacies] = useState([]);

  useEffect(() => {
    if (userLocation) {
      searchNearbyPharmacies().then(pharmacies => {
        setNearbyPharmacies(pharmacies || []);
      });
    }
  }, [userLocation]);

  const handleSaveAndSelect = async (pharmacy) => {
    // Check if pharmacy already exists
    const existing = savedPharmacies.find(p => 
      p.name === pharmacy.name && p.address === pharmacy.address
    );

    if (existing) {
      await setPreferredMutation.mutateAsync(existing.id);
      if (onPharmacySelected) {
        onPharmacySelected(existing);
      }
    } else {
      const saved = await savePharmacyMutation.mutateAsync({
        ...pharmacy,
        is_preferred: true
      });
      if (onPharmacySelected) {
        onPharmacySelected(saved);
      }
    }
  };

  const filteredSaved = savedPharmacies.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search & Location */}
      <div className="flex gap-2">
        <Input
          placeholder="Search pharmacies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button
          variant="outline"
          onClick={getUserLocation}
          disabled={isLoadingLocation}
        >
          {isLoadingLocation ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Map */}
      {userLocation && (
        <div className="h-64 rounded-lg overflow-hidden border">
          <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            
            {/* User location */}
            <Marker position={[userLocation.lat, userLocation.lng]}>
              <Popup>Your Location</Popup>
            </Marker>

            {/* Nearby pharmacies */}
            {nearbyPharmacies.map((pharmacy, idx) => (
              <Marker
                key={idx}
                position={[pharmacy.latitude, pharmacy.longitude]}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{pharmacy.name}</p>
                    <p className="text-xs">{pharmacy.address}</p>
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => handleSaveAndSelect(pharmacy)}
                    >
                      Select
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Nearby Pharmacies */}
      {nearbyPharmacies.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2">Nearby Pharmacies</h4>
          <div className="space-y-2">
            {nearbyPharmacies.map((pharmacy, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{pharmacy.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {pharmacy.address} • {pharmacy.distance}km away
                      </p>
                      {pharmacy.phone && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          <Phone className="w-3 h-3 inline mr-1" />
                          {pharmacy.phone}
                        </p>
                      )}
                      {pharmacy.hours && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {pharmacy.hours}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSaveAndSelect(pharmacy)}
                    className="w-full mt-2"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Select as Preferred
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Saved Pharmacies */}
      {filteredSaved.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2">Your Saved Pharmacies</h4>
          <div className="space-y-2">
            {filteredSaved.map((pharmacy) => (
              <Card key={pharmacy.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{pharmacy.name}</p>
                        {pharmacy.is_preferred && (
                          <Badge variant="outline" className="text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Preferred
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {pharmacy.address}
                      </p>
                      {pharmacy.phone && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          <Phone className="w-3 h-3 inline mr-1" />
                          {pharmacy.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  {!pharmacy.is_preferred && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreferredMutation.mutate(pharmacy.id)}
                      className="w-full mt-2"
                    >
                      Set as Preferred
                    </Button>
                  )}
                  {onPharmacySelected && selectedMedication && (
                    <Button
                      size="sm"
                      onClick={() => onPharmacySelected(pharmacy)}
                      className="w-full mt-2"
                    >
                      Order Refill Here
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!userLocation && savedPharmacies.length === 0 && (
        <div className="text-center py-8">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enable location to find nearby pharmacies
          </p>
          <Button
            onClick={getUserLocation}
            className="mt-4"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Use My Location
          </Button>
        </div>
      )}
    </div>
  );
}