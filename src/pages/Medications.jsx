import { useState } from 'react';
import { entities } from '@/lib/encryptedBase44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Search } from 'lucide-react';
import AddMedicationDialog from '../components/AddMedicationDialog';
import MedicationList from '../components/MedicationList';
import RefillReminders from '../components/RefillReminders';
import RootPageHeader from '../components/RootPageHeader';
import PullToRefresh from '../components/PullToRefresh';

export default function Medications() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [search, setSearch]               = useState('');
  const [showInactive, setShowInactive]   = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['medications', 'all'] });
  };

  // Fetch ALL medications (active + inactive) so we can toggle inactive visibility
  const { data: allMedications = [], isLoading } = useQuery({
    queryKey: ['medications', 'all'],
    queryFn:  () => /** @type {any} */ (entities).Medication.list(),
  });

  const activeMedications = allMedications.filter(m => m.active !== false);

  const filtered = allMedications.filter(med => {
    if (!showInactive && med.active === false) return false;
    const q = search.toLowerCase();
    if (q && !med.name?.toLowerCase().includes(q) && !med.dosage?.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div style={{ overscrollBehavior: 'none' }}>
      <RootPageHeader
        title="My Medications"
        subtitle="Manage your medication list and refill reminders"
      />
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 pb-24" style={{ overscrollBehavior: 'none' }}>

          {/* Refill Reminders — only uses active meds */}
          <div className="mb-6">
            <RefillReminders medications={activeMedications} />
          </div>

          <Card className="bg-white/80 dark:bg-gray-900/50 backdrop-blur border-gray-200/50 dark:border-gray-800/50 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="dark:text-white">All Medications</CardTitle>
                <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700 h-11 select-none">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search medications…"
                  className="pl-9 h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              {/* Show inactive toggle */}
              <div className="flex items-center gap-2 mt-2">
                <Switch
                  id="show-inactive"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                  className="select-none"
                />
                <Label htmlFor="show-inactive" className="text-sm text-gray-500 dark:text-gray-400 select-none">
                  Show paused medications
                </Label>
              </div>
            </CardHeader>

            <CardContent>
              <MedicationList medications={filtered} isLoading={isLoading} />
            </CardContent>
          </Card>

          {showAddDialog && (
            <AddMedicationDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
