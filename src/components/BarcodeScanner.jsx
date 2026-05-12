import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

async function lookupBarcode(barcode) {
  const ndc = barcode.replace(/-/g, '');
  const urls = [
    `https://api.fda.gov/drug/ndc.json?search=product_ndc:"${ndc}"&limit=1`,
    `https://api.fda.gov/drug/label.json?search=openfda.upc:"${barcode}"&limit=1`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const r = json.results?.[0];
      if (!r) continue;
      // NDC endpoint
      if (r.brand_name || r.generic_name) {
        return {
          medication_name: r.brand_name || r.generic_name,
          dosage: r.active_ingredients?.[0]?.strength ?? '',
        };
      }
      // Label endpoint
      const name = r.openfda?.brand_name?.[0] ?? r.openfda?.generic_name?.[0];
      if (name) return { medication_name: name, dosage: '' };
    } catch { }
  }
  return null;
}

export default function BarcodeScanner({ onBarcodeScanned, onClose }) {
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    try {
      if (!('BarcodeDetector' in window)) {
        toast.error('Barcode detection not supported on this device — enter details manually');
        onClose?.();
        return;
      }

      const detector = new window.BarcodeDetector({
        formats: ['code_128', 'ean_13', 'ean_8', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
      });
      const bitmap = await createImageBitmap(file);
      const barcodes = await detector.detect(bitmap);

      if (barcodes.length === 0) {
        toast.error('No barcode detected — try a clearer photo');
        return;
      }

      const rawValue = barcodes[0].rawValue;
      const info = await lookupBarcode(rawValue);

      onBarcodeScanned({
        barcode: rawValue,
        medication_name: info?.medication_name ?? '',
        dosage: info?.dosage ?? '',
        found: !!info,
      });
      toast.success(info ? `Found: ${info.medication_name}` : 'Barcode scanned — enter details manually');
      onClose?.();
    } catch {
      toast.error('Failed to scan barcode');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
        <Camera className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Take a photo of the medication barcode or packaging
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageCapture}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={analyzing}
          className="w-full h-12 select-none"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Camera className="w-5 h-5 mr-2" />
              Scan Barcode
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
