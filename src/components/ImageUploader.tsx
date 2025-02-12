
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  isLoading?: boolean;
}

export const ImageUploader = ({ onImageSelect, isLoading }: ImageUploaderProps) => {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      onImageSelect(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    disabled: isLoading
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer",
          "hover:border-emerald-500 hover:bg-emerald-50/50",
          isDragActive && "border-emerald-500 bg-emerald-50/50",
          "flex flex-col items-center justify-center gap-4",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        {preview ? (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden">
            <img 
              src={preview} 
              alt="Preview" 
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <>
            <ImageIcon className="w-12 h-12 text-gray-400" />
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Drag and drop your image here, or click to select
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports JPG, PNG and WebP
              </p>
            </div>
          </>
        )}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        )}
      </div>
    </div>
  );
};
