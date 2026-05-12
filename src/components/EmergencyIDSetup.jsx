import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getEmergencyID, saveEmergencyID, EMPTY_EMERGENCY_ID } from './EmergencyIDCard';

export default function EmergencyIDSetup() {
  const [form, setForm] = useState(EMPTY_EMERGENCY_ID);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = getEmergencyID();
    if (existing) setForm({ ...EMPTY_EMERGENCY_ID, ...existing });
  }, []);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = () => {
    if (!form.full_name.trim()) {
      toast.error('Full name is required for the Emergency ID');
      return;
    }
    saveEmergencyID(form);
    setSaved(true);
    toast.success('Emergency Medical ID saved');
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Card className="shadow-md border-l-4 border-l-red-600 dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-white">
          <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
          Emergency Medical ID
        </CardTitle>
        <div className="flex items-start gap-2 mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-800 dark:text-red-300">
            This information is stored <strong>without encryption</strong> so paramedics can read it even when the app is locked. Do not include passwords or financial information here.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label className="dark:text-white text-sm font-medium">Full Name *</Label>
            <Input
              value={form.full_name}
              onChange={set('full_name')}
              placeholder="Your full legal name"
              className="mt-1 h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="dark:text-white text-sm font-medium">Date of Birth</Label>
              <Input
                value={form.date_of_birth}
                onChange={set('date_of_birth')}
                placeholder="DD/MM/YYYY"
                className="mt-1 h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label className="dark:text-white text-sm font-medium">Blood Type</Label>
              <Input
                value={form.blood_type}
                onChange={set('blood_type')}
                placeholder="e.g. A+"
                className="mt-1 h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div>
            <Label className="dark:text-white text-sm font-medium">Medical Conditions</Label>
            <Textarea
              value={form.conditions}
              onChange={set('conditions')}
              placeholder="e.g. Panhypopituitarism, Type 1 Diabetes, Visual Impairment"
              className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={2}
            />
          </div>

          <div>
            <Label className="dark:text-white text-sm font-medium">Allergies</Label>
            <Textarea
              value={form.allergies}
              onChange={set('allergies')}
              placeholder="e.g. Penicillin, Latex, Peanuts"
              className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={2}
            />
          </div>

          <div>
            <Label className="dark:text-white text-sm font-medium">Critical Medications</Label>
            <Textarea
              value={form.critical_medications}
              onChange={set('critical_medications')}
              placeholder="e.g. Hydrocortisone 10mg (must not miss), Levothyroxine 100mcg"
              className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={2}
            />
          </div>

          <div>
            <Label className="dark:text-white text-sm font-medium">Additional Notes for Paramedics</Label>
            <Textarea
              value={form.notes}
              onChange={set('notes')}
              placeholder="e.g. Requires steroid stress dosing in emergencies. Give 100mg IV hydrocortisone if unconscious."
              className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={3}
            />
          </div>

          <div className="border-t dark:border-gray-600 pt-4">
            <p className="text-sm font-medium dark:text-white mb-3">Emergency Contact</p>
            <div className="space-y-3">
              <div>
                <Label className="dark:text-white text-sm">Name</Label>
                <Input
                  value={form.emergency_contact_name}
                  onChange={set('emergency_contact_name')}
                  placeholder="Contact name"
                  className="mt-1 h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="dark:text-white text-sm">Phone</Label>
                  <Input
                    value={form.emergency_contact_phone}
                    onChange={set('emergency_contact_phone')}
                    placeholder="+44..."
                    type="tel"
                    className="mt-1 h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <Label className="dark:text-white text-sm">Relationship</Label>
                  <Input
                    value={form.emergency_contact_relationship}
                    onChange={set('emergency_contact_relationship')}
                    placeholder="e.g. Parent"
                    className="mt-1 h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label className="dark:text-white text-sm font-medium">GP / Doctor</Label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <Input
                value={form.gp_name}
                onChange={set('gp_name')}
                placeholder="Dr. Name"
                className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <Input
                value={form.gp_phone}
                onChange={set('gp_phone')}
                placeholder="GP phone"
                type="tel"
                className="h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold"
        >
          {saved ? (
            <><CheckCircle className="w-4 h-4 mr-2" /> Saved</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Save Emergency ID</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
