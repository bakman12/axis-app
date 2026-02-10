import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Image, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function MedicationImageUpload({ imageUrl, onImageUploaded, onRemove }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onImageUploaded(file_url);
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium dark:text-white">Medication Image</label>
      
      {imageUrl ? (
        <div className="relative">
          <img
            src={imageUrl}
            alt="Medication"
            className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
          />
          <Button
            onClick={onRemove}
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
          <Image className="w-10 h-10 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Add a photo for visual identification
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            variant="outline"
            className="h-10"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Image className="w-4 h-4 mr-2" />
                Upload Image
              </>
            )}
          </Button>
        </div>
      )}
      
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Take a photo of your medication for easy visual identification
      </p>
    </div>
  );
}