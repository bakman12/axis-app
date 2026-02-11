import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import AddMedicationDialog from '../components/AddMedicationDialog';
import MedicationList from '../components/MedicationList';
import RefillReminders from '../components/RefillReminders';
import RootPageHeader from '../components/RootPageHeader';
import PullToRefresh from '../components/PullToRefresh';
import { useQueryClient } from '@tanstack/react-query';

export default function Medications() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries(['medications']);
  };

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ['medications'],
    queryFn: () => base44.entities.Medication.filter({ active: true })
  });

  return (
    <div style={{ overscrollBehavior: 'none' }}>
      <RootPageHeader 
        title="My Medications" 
        subtitle="Manage your medication list and refill reminders" 
      />
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 pb-24" style={{ overscrollBehavior: 'none' }}>
          
          {/* Refill Reminders */}
          <div className="mb-6">
            <RefillReminders medications={medications} />
          </div>

          {/* All Medications */}
          <Card className="bg-white/80 dark:bg-gray-900/50 backdrop-blur border-gray-200/50 dark:border-gray-800/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="dark:text-white">All Medications</CardTitle>
              <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700 h-11 select-none">
                <Plus className="w-4 h-4 mr-2" />
                Add Medication
              </Button>
            </CardHeader>
            <CardContent>
              <MedicationList medications={medications} isLoading={isLoading} />
            </CardContent>
          </Card>

          {showAddDialog && (
            <AddMedicationDialog
              open={showAddDialog}
              onClose={() => setShowAddDialog(false)}
            />
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}