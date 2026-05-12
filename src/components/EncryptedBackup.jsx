import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { entities } from '@/lib/encryptedBase44Client';
import { logAuditEvent, AUDIT } from '@/lib/auditLog';
import { format } from 'date-fns';

// ── Crypto helpers ────────────────────────────────────────────────────────────
// Same pattern as the main app: PBKDF2 (300k rounds) + AES-256-GCM.
// The passphrase never leaves the device — only the ciphertext is exported.

async function deriveKey(passphrase, salt) {
  const material = await window.crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 300_000, hash: 'SHA-256' },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

async function encryptPayload(payload, passphrase) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv   = window.crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(passphrase, salt);
  const ct   = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload))
  );
  return JSON.stringify({
    v:    1,
    salt: btoa(String.fromCharCode(...salt)),
    iv:   btoa(String.fromCharCode(...iv)),
    ct:   btoa(String.fromCharCode(...new Uint8Array(ct))),
  });
}

async function decryptPayload(fileText, passphrase) {
  const { v, salt, iv, ct } = JSON.parse(fileText);
  if (v !== 1) throw new Error('Unknown backup version');
  const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
  const ivBytes   = Uint8Array.from(atob(iv),   c => c.charCodeAt(0));
  const ctBytes   = Uint8Array.from(atob(ct),   c => c.charCodeAt(0));
  const key       = await deriveKey(passphrase, saltBytes);
  const plain     = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, ctBytes);
  return JSON.parse(new TextDecoder().decode(plain));
}
// ─────────────────────────────────────────────────────────────────────────────

export default function EncryptedBackup() {
  const [exportPass,    setExportPass]    = useState('');
  const [importPass,    setImportPass]    = useState('');
  const [exporting,     setExporting]     = useState(false);
  const [importing,     setImporting]     = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    if (exportPass.length < 6) { toast.error('Passphrase must be at least 6 characters'); return; }
    setExporting(true);
    try {
      const [medications, trips] = await Promise.all([
        /** @type {any} */ (entities).Medication.list(),
        /** @type {any} */ (entities).Trip.list(),
      ]);

      const payload = { exportedAt: new Date().toISOString(), medications, trips };
      const encrypted = await encryptPayload(payload, exportPass);

      const blob = new Blob([encrypted], { type: 'application/octet-stream' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `axis-backup-${format(new Date(), 'yyyy-MM-dd')}.axisbak`;
      a.click();
      URL.revokeObjectURL(url);

      logAuditEvent(AUDIT.DATA_EXPORTED, { type: 'encrypted_backup' });
      toast.success('Backup saved — keep your passphrase safe!');
      setExportPass('');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!importPass) { toast.error('Enter your passphrase first'); return; }

    setImporting(true);
    try {
      const text    = await file.text();
      const payload = await decryptPayload(text, importPass);
      setPendingRestore(payload);
    } catch {
      toast.error('Could not decrypt — wrong passphrase or corrupted file');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleRestore = async () => {
    if (!pendingRestore) return;
    setImporting(true);
    try {
      const { medications = [], trips = [] } = pendingRestore;
      // Strip IDs so new records are created fresh (avoids ID collisions)
      await Promise.all([
        ...medications.map(({ id, ...data }) => /** @type {any} */ (entities).Medication.create(data)),
        ...trips.map(({ id, ...data }) => /** @type {any} */ (entities).Trip.create(data)),
      ]);
      toast.success(`Restored ${medications.length} medications and ${trips.length} trips`);
      setPendingRestore(null);
      setImportPass('');
    } catch {
      toast.error('Restore failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="shadow-md border-l-4 border-l-blue-500 dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-white">
          <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Encrypted Backup
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          AES-256 encrypted export — only you can restore it with your passphrase
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ── Export ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold dark:text-white">Export</h3>
          <div>
            <Label className="text-sm dark:text-white">Backup Passphrase</Label>
            <Input type="password" value={exportPass} onChange={e => setExportPass(e.target.value)}
              placeholder="Min. 6 characters — remember this!"
              className="h-11 mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <Button onClick={handleExport} disabled={exporting || exportPass.length < 6}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 select-none">
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Encrypting…' : 'Export Encrypted Backup (.axisbak)'}
          </Button>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Saves all medications and trips. Without the passphrase the file is unreadable.
          </p>
        </div>

        {/* ── Restore ── */}
        <div className="border-t dark:border-gray-600 pt-4 space-y-3">
          <h3 className="text-sm font-semibold dark:text-white">Restore</h3>
          <div>
            <Label className="text-sm dark:text-white">Backup Passphrase</Label>
            <Input type="password" value={importPass} onChange={e => setImportPass(e.target.value)}
              placeholder="Passphrase used during export"
              className="h-11 mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <input ref={fileInputRef} type="file" accept=".axisbak" onChange={handleFileSelect} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} disabled={importing || !importPass}
            variant="outline"
            className="w-full h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white select-none">
            <Upload className="w-4 h-4 mr-2" />
            {importing ? 'Decrypting…' : 'Select Backup File (.axisbak)'}
          </Button>

          {pendingRestore && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-3 space-y-2">
              <p className="text-sm font-semibold dark:text-white">Decrypted successfully</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {pendingRestore.medications?.length ?? 0} medications · {pendingRestore.trips?.length ?? 0} trips
                <br />Exported {new Date(pendingRestore.exportedAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Restored items are added alongside existing data — nothing is deleted.
              </p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setPendingRestore(null)}
                  className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleRestore} disabled={importing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 select-none">
                  Restore Now
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
