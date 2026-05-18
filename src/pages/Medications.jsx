import { useState, useMemo } from 'react';
import { entities } from '@/lib/encryptedBase44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Search, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import AddMedicationDialog from '../components/AddMedicationDialog';
import MedicationList from '../components/MedicationList';
import RefillReminders from '../components/RefillReminders';
import RootPageHeader from '../components/RootPageHeader';
import PullToRefresh from '../components/PullToRefresh';
import { scanAllInteractions, severityStyles } from '@/lib/drugInteractions';

export default function Medications() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [search, setSearch]               = useState('');
  const [showInactive, setShowInactive]   = useState(false);
  const [scanOpen, setScanOpen]           = useState(false);
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

  const interactions = useMemo(
    () => scanOpen ? scanAllInteractions(activeMedications) : [],
    [scanOpen, activeMedications]
  );

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

          {/* Interaction scan */}
          {activeMedications.length >= 2 && (
            <div className="mb-6">
              <button
                onClick={() => setScanOpen(v => !v)}
                className="w-full flex items-center justify-between p-3 bg-white/80 dark:bg-gray-900/50 backdrop-blur border border-gray-200/50 dark:border-gray-800/50 rounded-xl shadow-sm text-sm font-medium dark:text-white select-none"
              >
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  Check Drug Interactions ({activeMedications.length} active meds)
                </span>
                {scanOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {scanOpen && (
                <div className="mt-2 space-y-2">
                  {interactions.length === 0 ? (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl text-sm text-green-800 dark:text-green-200">
                      No known interactions found between your current medications.
                    </div>
                  ) : (
                    interactions.map((w, i) => {
                      const s = severityStyles(w.severity);
                      return (
                        <div key={i} className={`p-3 rounded-xl border ${s.bg} ${s.border}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${s.badge}`}>{w.severity}</span>
                            <span className={`text-xs font-semibold ${s.text}`}>{w.drug1} + {w.drug2}</span>
                          </div>
                          <p className={`text-xs ${s.text}`}>{w.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

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
