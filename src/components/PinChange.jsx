import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useCrypto } from '@/lib/CryptoContext';
import { logAuditEvent, AUDIT } from '@/lib/auditLog';

export default function PinChange() {
  const { changePin } = useCrypto();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin]         = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins]     = useState(false);
  const [loading, setLoading]       = useState(false);

  const handleChange = async () => {
    if (newPin.length < 4) { toast.error('PIN must be at least 4 digits'); return; }
    if (newPin !== confirmPin) { toast.error('New PINs do not match'); return; }
    if (newPin === currentPin) { toast.error('New PIN must differ from current PIN'); return; }

    setLoading(true);
    const ok = await changePin(currentPin, newPin);
    setLoading(false);

    if (ok) {
      logAuditEvent(AUDIT.PIN_CHANGED);
      toast.success('PIN changed successfully');
      setCurrentPin(''); setNewPin(''); setConfirmPin('');
    } else {
      toast.error('Current PIN is incorrect');
    }
  };

  const type = showPins ? 'text' : 'password';

  return (
    <Card className="shadow-md border-l-4 border-l-orange-500 dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-white">
          <Lock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          Change PIN
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Re-encrypts your master key with the new PIN — all data stays intact
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm dark:text-white">Current PIN</Label>
          <Input type={type} value={currentPin} onChange={e => setCurrentPin(e.target.value)}
            placeholder="Enter current PIN" maxLength={20}
            className="h-11 mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        </div>
        <div>
          <Label className="text-sm dark:text-white">New PIN</Label>
          <Input type={type} value={newPin} onChange={e => setNewPin(e.target.value)}
            placeholder="Min. 4 characters" maxLength={20}
            className="h-11 mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        </div>
        <div>
          <Label className="text-sm dark:text-white">Confirm New PIN</Label>
          <Input type={type} value={confirmPin} onChange={e => setConfirmPin(e.target.value)}
            placeholder="Repeat new PIN" maxLength={20}
            className="h-11 mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        </div>

        <button type="button" onClick={() => setShowPins(v => !v)}
          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 select-none">
          {showPins ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showPins ? 'Hide' : 'Show'} PINs
        </button>

        <Button onClick={handleChange}
          disabled={loading || !currentPin || !newPin || !confirmPin}
          className="w-full h-11 bg-orange-600 hover:bg-orange-700 select-none">
          {loading ? 'Verifying…' : 'Change PIN'}
        </Button>
      </CardContent>
    </Card>
  );
}
