import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Calculator } from 'lucide-react';

export default function PackingCalculator({ medications }) {
  const [days, setDays] = useState('');
  const [results, setResults] = useState(null);

  const calculatePacking = () => {
    if (!days || days <= 0) return;

    const calculations = medications.map(med => {
      let dosesPerDay = 1;
      if (med.frequency === 'twice_daily') dosesPerDay = 2;
      if (med.frequency === 'three_times_daily') dosesPerDay = 3;
      if (med.frequency === 'weekly') dosesPerDay = 1 / 7;

      const neededDoses = Math.ceil(dosesPerDay * parseInt(days));
      const recommendedDoses = Math.ceil(neededDoses * 1.2);

      return {
        name: med.name,
        dosage: med.dosage,
        needed: neededDoses,
        recommended: recommendedDoses
      };
    });

    setResults(calculations);
  };

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-white">
          <Calculator className="w-5 h-5 text-green-600 dark:text-green-400" />
          Quick Packing Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="days" className="dark:text-white">Trip Duration (days)</Label>
            <Input
              id="days"
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="e.g., 7"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <Button
            onClick={calculatePacking}
            disabled={!days || days <= 0}
            className="bg-green-600 hover:bg-green-700 mt-8"
          >
            <Package className="w-4 h-4 mr-2" />
            Calculate
          </Button>
        </div>

        {results && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <h4 className="font-medium text-sm mb-3 dark:text-white">Packing List for {days} Days</h4>
            <div className="space-y-2">
              {results.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <div>
                    <span className="font-medium dark:text-white">{item.name}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">({item.dosage})</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-700 dark:text-green-400">
                      Pack {item.recommended}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.needed} needed + buffer
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
              💡 Includes 20% safety buffer for unexpected delays
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}