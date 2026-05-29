'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api';

interface ImageUploadButtonProps {
  onImageUploaded: (imageUrl: string) => void;
  disabled?: boolean;
}

export function ImageUploadButton({ onImageUploaded, disabled }: ImageUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/uploads/cms', formData);

      if (response.data.success && response.data.data?.url) {
        onImageUploaded(response.data.data.url);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError(response.data.error || 'Failed to upload image');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        id="cms-image-upload"
        disabled={disabled || uploading}
      />
      <label htmlFor="cms-image-upload" className="cursor-pointer">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={(e) => {
            e.preventDefault();
            if (!disabled && !uploading) {
              fileInputRef.current?.click();
            }
          }}
        >
          {uploading ? 'Uploading...' : '📷 Upload Image'}
        </Button>
      </label>
      {error && (
        <span className="text-sm text-red-600" title={error}>
          ⚠️
        </span>
      )}
    </div>
  );
}
