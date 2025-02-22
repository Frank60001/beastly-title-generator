
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  isLoading?: boolean;
}

export const ImageUploader = ({ onImageSelect, isLoading }: ImageUploaderProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [results, setResults] = useState<{ gemini: string[], gpt4: string[] } | null>(null);

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

  const handleAnalyze = async () => {
    if (!selectedFile || isLoading) return;

    try {
      // Convert the file to base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = async () => {
        const base64Data = reader.result?.toString().split(',')[1]; // Remove data URL prefix
        
        if (!base64Data) {
          toast.error("Failed to process image");
          return;
        }

        const { data, error } = await supabase.functions.invoke('generate-thumbnail', {
          body: { image_base64: base64Data }
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        if (data?.success) {
          setResults(data.data.results);
          toast.success("Analysis complete!");
        }
      };
    } catch (error) {
      toast.error("Failed to analyze image");
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
    <div className="w-full space-y-4">
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
                Drop an image here, or click to select
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports JPG, PNG and WebP
              </p>
            </div>
          </>
        )}
      </div>

      {preview && !isLoading && (
        <Button
          onClick={handleAnalyze}
          className="w-full bg-blue-500 hover:bg-blue-600"
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Analyze with AI
        </Button>
      )}

      {isLoading && (
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {results && (
        <div className="space-y-4 mt-4">
          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Gemini Analysis</h3>
            <ul className="space-y-2">
              {results.gemini.map((title, i) => (
                <li key={i} className="bg-[#2A2A2A] p-3 rounded">{title}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-400 mb-2">GPT-4 Analysis</h3>
            <ul className="space-y-2">
              {results.gpt4.map((title, i) => (
                <li key={i} className="bg-[#2A2A2A] p-3 rounded">{title}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
