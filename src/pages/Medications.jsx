import { useState, useMemo } from 'react';
import { entities } from '@/lib/encryptedBase44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };
const sans  = { fontFamily: 'Inter, sans-serif' };

export default function Medications() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [search, setSearch]               = useState('');
  const [showInactive, setShowInactive]   = useState(false);
  const [scanOpen, setScanOpen]           = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['medications', 'all'] });
  };

  const { data: allMedications = [], isLoading } = useQuery({
    queryKey: ['medications', 'all'],
    queryFn:  () => entities.Medication.list(),
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
    <div style={{ overscrollBehavior: 'none', background: 'hsl(var(--background))', minHeight: '100vh' }}>
      <RootPageHeader title="Medications" subtitle="Your active regimen" />

      <PullToRefresh onRefresh={handleRefresh}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 96px', overscrollBehavior: 'none' }}>

          {/* Refill reminders */}
          <div style={{ marginBottom: 24 }}>
            <RefillReminders medications={activeMedications} />
          </div>

          {/* Drug interaction scanner */}
          {activeMedications.length >= 2 && (
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setScanOpen(v => !v)}
                style={{
                  ...sans, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
                  borderRadius: 12, fontSize: '0.82rem', fontWeight: 500, color: 'hsl(var(--foreground))', cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap style={{ width: 15, height: 15, color: 'hsl(var(--primary))' }} />
                  Check Drug Interactions ({activeMedications.length} meds)
                </span>
                {scanOpen
                  ? <ChevronUp style={{ width: 15, height: 15, color: 'hsl(var(--muted-foreground))' }} />
                  : <ChevronDown style={{ width: 15, height: 15, color: 'hsl(var(--muted-foreground))' }} />}
              </button>

              {scanOpen && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {interactions.length === 0 ? (
                    <div style={{ padding: '14px 16px', background: 'rgba(44,44,44,0.04)', border: '1px solid hsl(var(--border))', borderRadius: 12, ...sans, fontSize: '0.82rem', color: 'hsl(var(--foreground))' }}>
                      No known interactions found between your current medications.
                    </div>
                  ) : (
                    interactions.map((w, i) => {
                      const s = severityStyles(w.severity);
                      return (
                        <div key={i} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(199,91,58,0.25)', background: 'rgba(199,91,58,0.06)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ ...sans, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 100, background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>{w.severity}</span>
                            <span style={{ ...sans, fontSize: '0.78rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>{w.drug1} + {w.drug2}</span>
                          </div>
                          <p style={{ ...sans, fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))' }}>{w.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Medications card */}
          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, overflow: 'hidden' }}>
            {/* Card header */}
            <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid hsl(var(--border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ ...serif, fontSize: '1.25rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>All Medications</h2>
                <button
                  onClick={() => setShowAddDialog(true)}
                  style={{ ...sans, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', border: 'none', borderRadius: 100, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', minHeight: 38 }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  Add
                </button>
              </div>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'hsl(var(--muted-foreground))' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search medications…"
                  style={{ ...sans, width: '100%', padding: '10px 12px 10px 34px', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: '0.85rem', color: 'hsl(var(--foreground))', outline: 'none' }}
                />
              </div>

              {/* Inactive toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
                <Label htmlFor="show-inactive" style={{ ...sans, fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}>
                  Show paused medications
                </Label>
              </div>
            </div>

            {/* List */}
            <div style={{ padding: '8px 0' }}>
              <MedicationList medications={filtered} isLoading={isLoading} />
            </div>
          </div>

        </div>
      </PullToRefresh>

      {showAddDialog && (
        <AddMedicationDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
      )}
    </div>
  );
}
