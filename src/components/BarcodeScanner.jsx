import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function BarcodeScanner({ onBarcodeScanned, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    try {
      // Upload the image
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Use AI to extract barcode from image
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this image and extract any medication barcode, NDC number, or product code visible. 
        If you find one, return it. If not, return null.
        Also identify if you can see the medication name, dosage, or any other relevant information.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            barcode: { type: "string" },
            medication_name: { type: "string" },
            dosage: { type: "string" },
            found: { type: "boolean" }
          }
        }
      });

      if (result.found && result.barcode) {
        onBarcodeScanned(result);
        toast.success('Barcode scanned successfully!');
      } else {
        toast.error('No barcode detected in image. Try taking a clearer photo.');
      }
    } catch (error) {
      toast.error('Failed to scan barcode');
    } finally {
      setAnalyzing(false);
      if (onClose) onClose();
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
              Analyzing...
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