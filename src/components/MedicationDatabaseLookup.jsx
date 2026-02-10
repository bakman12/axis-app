import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function MedicationDatabaseLookup({ onMedicationFound }) {
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a medication name');
      return;
    }

    setSearching(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for detailed information about this medication: "${searchQuery}"
        
        Provide:
        - Official medication name
        - Common dosage forms (tablet, capsule, liquid, etc.)
        - Typical dosages
        - Manufacturer (if known)
        - Common administration instructions
        - Any critical warnings or notes
        
        Use current, accurate medical database information.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            dosage_forms: { type: "array", items: { type: "string" } },
            common_dosages: { type: "array", items: { type: "string" } },
            manufacturer: { type: "string" },
            instructions: { type: "string" },
            warnings: { type: "string" },
            found: { type: "boolean" }
          }
        }
      });

      if (result.found) {
        onMedicationFound(result);
        toast.success('Medication information found!');
      } else {
        toast.error('Medication not found. Please enter details manually.');
      }
    } catch (error) {
      toast.error('Failed to search medication database');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
        🔍 Quick Lookup
      </p>
      <p className="text-xs text-blue-700 dark:text-blue-300">
        Search medication database to auto-fill details
      </p>
      
      <div className="flex gap-2">
        <Input
          placeholder="Enter medication name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 h-11 dark:bg-gray-900 dark:border-blue-700"
        />
        <Button
          onClick={handleSearch}
          disabled={searching}
          className="h-11 select-none"
        >
          {searching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}