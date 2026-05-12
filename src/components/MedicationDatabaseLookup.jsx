import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

async function searchOpenFDA(query) {
  const term = encodeURIComponent(`"${query}"`);
  // Try brand name first, then generic name
  const urls = [
    `https://api.fda.gov/drug/label.json?search=openfda.brand_name:${term}&limit=1`,
    `https://api.fda.gov/drug/label.json?search=openfda.generic_name:${term}&limit=1`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const r = json.results?.[0];
      if (!r) continue;

      const name =
        r.openfda?.brand_name?.[0] ||
        r.openfda?.generic_name?.[0] ||
        query;

      const dosage_forms = r.openfda?.dosage_form ?? [];
      const manufacturer = r.openfda?.manufacturer_name?.[0] ?? '';

      // Dosage administration text is often very long — take first 300 chars
      const raw_instructions = r.dosage_and_administration?.[0] ?? '';
      const instructions = raw_instructions.length > 300
        ? raw_instructions.slice(0, 300).replace(/\s\S*$/, '') + '…'
        : raw_instructions;

      const raw_warnings = r.warnings?.[0] ?? r.warnings_and_cautions?.[0] ?? '';
      const warnings = raw_warnings.length > 200
        ? raw_warnings.slice(0, 200).replace(/\s\S*$/, '') + '…'
        : raw_warnings;

      return { name, dosage_forms, manufacturer, instructions, warnings, found: true };
    } catch {
      // try next URL
    }
  }
  return null;
}

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
      const result = await searchOpenFDA(searchQuery.trim());
      if (result) {
        onMedicationFound(result);
        toast.success(`Found: ${result.name}`);
      } else {
        toast.error('Medication not found — please enter details manually');
      }
    } catch {
      toast.error('Search failed — please check your connection');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <p className="text-sm font-medium text-blue-900 dark:text-blue-200">🔍 Quick Lookup</p>
      <p className="text-xs text-blue-700 dark:text-blue-300">
        Search the FDA drug database to auto-fill details
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="Enter medication name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 h-11 dark:bg-gray-900 dark:border-blue-700"
        />
        <Button onClick={handleSearch} disabled={searching} className="h-11 select-none">
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
