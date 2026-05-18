import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Activity, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { loadSymptoms, addSymptom, deleteSymptom } from '@/lib/symptomLog';

const SEVERITIES = [
  { value: 'mild',     label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe',   label: 'Severe' },
];

const SEVERITY_CLASSES = {
  mild:     'border-yellow-300 text-yellow-700 dark:text-yellow-300 dark:border-yellow-700',
  moderate: 'border-orange-300 text-orange-700 dark:text-orange-300 dark:border-orange-700',
  severe:   'border-red-400 text-red-700 dark:text-red-300 dark:border-red-700',
};

export default function SymptomLog({ medications = [] }) {
  const [symptoms, setSymptoms] = useState(() => loadSymptoms());
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [form, setForm] = useState({ symptom: '', severity: 'mild', medication_name: '', notes: '' });

  const handleAdd = () => {
    if (!form.symptom.trim()) return;
    addSymptom(form);
    setSymptoms(loadSymptoms());
    setForm({ symptom: '', severity: 'mild', medication_name: '', notes: '' });
    setShowForm(false);
  };

  const handleDelete = (id) => {
    deleteSymptom(id);
    setSymptoms(loadSymptoms());
  };

  const displayed = showAll ? symptoms : symptoms.slice(0, 3);

  return (
    <Card className="shadow-md dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 dark:text-white text-base">
            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Side Effect Log
          </CardTitle>
          <Button
            size="sm"
            variant={showForm ? 'outline' : 'default'}
            onClick={() => setShowForm(v => !v)}
            className="h-8"
          >
            <Plus className="w-4 h-4 mr-1" />
            Log
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {showForm && (
          <div className="p-3 bg-gray-50 dark:bg-gray-700/60 rounded-lg space-y-3 border border-gray-200 dark:border-gray-600">
            <Input
              value={form.symptom}
              onChange={e => setForm({ ...form, symptom: e.target.value })}
              placeholder="Symptom (e.g. nausea, dizziness)…"
              className="h-10 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <MobileSelect
                value={form.severity}
                onValueChange={v => setForm({ ...form, severity: v })}
                options={SEVERITIES}
                placeholder="Severity"
              />
              <MobileSelect
                value={form.medication_name}
                onValueChange={v => setForm({ ...form, medication_name: v })}
                options={[
                  { value: '', label: 'No specific med' },
                  ...medications.map(m => ({ value: m.name, label: m.name })),
                ]}
                placeholder="Related med"
              />
            </div>
            <Textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes…"
              className="h-16 text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white resize-none"
            />
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={!form.symptom.trim()} className="flex-1 h-9 select-none">Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="h-9 select-none">Cancel</Button>
            </div>
          </div>
        )}

        {symptoms.length === 0 && !showForm && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No side effects logged yet. Tap Log to record one.
          </p>
        )}

        {displayed.map(entry => (
          <div key={entry.id} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700/40 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm dark:text-white">{entry.symptom}</p>
                <Badge
                  variant="outline"
                  className={`text-xs capitalize ${SEVERITY_CLASSES[entry.severity] ?? ''}`}
                >
                  {entry.severity}
                </Badge>
                {entry.medication_name && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">{entry.medication_name}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {format(new Date(entry.timestamp), 'd MMM yyyy, HH:mm')}
              </p>
              {entry.notes && (
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{entry.notes}</p>
              )}
            </div>
            <button
              onClick={() => handleDelete(entry.id)}
              className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0 p-1 min-h-[44px] flex items-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {symptoms.length > 3 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="w-full flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 py-2"
          >
            {showAll
              ? <><ChevronUp className="w-3 h-3" /> Show less</>
              : <><ChevronDown className="w-3 h-3" /> Show all {symptoms.length}</>}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
