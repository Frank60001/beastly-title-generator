
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ImageIcon, Loader2, Upload, Wand2 } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  isLoading?: boolean;
}

export const ImageUploader = ({ onImageSelect, isLoading }: ImageUploaderProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAnalyze = () => {
    if (selectedFile && !isLoading) {
      onImageSelect(selectedFile);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    disabled: isLoading
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer",
          "hover:border-blue-500 hover:bg-[#2A2A2A]",
          isDragActive && "border-blue-500 bg-[#2A2A2A]",
          "flex flex-col items-center justify-center gap-4",
          isLoading && "opacity-50 cursor-not-allowed",
          "bg-[#333] border-[#444]"
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
            <Upload className="w-12 h-12 text-gray-400" />
            <div className="text-center">
              <p className="text-sm text-gray-300">
                Drag and drop your image here, or click to select
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports JPG, PNG and WebP
              </p>
            </div>
          </>
        )}
        {isLoading && (
          <div className="absolute inset-0 bg-[#222]/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}
      </div>
      {preview && !isLoading && (
        <Button
          onClick={handleAnalyze}
          className="w-full mt-4 bg-blue-500 hover:bg-blue-600"
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Analyze Image
        </Button>
      )}
    </div>
  );
};
