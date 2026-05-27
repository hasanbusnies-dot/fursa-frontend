'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_IMAGES = 10;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

interface ImagesStepProps {
  images: File[];
  onChange: (files: File[]) => void;
}

export function ImagesStep({ images, onChange }: ImagesStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [images]);

  const addFiles = (incoming: FileList | File[]) => {
    const valid = Array.from(incoming).filter((f) => f.type.startsWith('image/'));
    const merged = [...images, ...valid].slice(0, MAX_IMAGES);
    onChange(merged);
  };

  const remove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Add Photos</h2>
      <p className="text-sm text-gray-500 mb-6">
        Listings with photos get 3× more views. Add up to {MAX_IMAGES} images.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3',
          'cursor-pointer transition-colors text-center',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50',
          images.length >= MAX_IMAGES && 'pointer-events-none opacity-50'
        )}
      >
        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
          <UploadCloud className="w-7 h-7 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">
            {isDragging ? 'Drop images here' : 'Drag & drop images here'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">or click to browse — JPEG, PNG, WebP</p>
        </div>
        <p className="text-xs text-gray-400">
          {images.length}/{MAX_IMAGES} images added
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* Preview grid */}
      {previews.length > 0 && (
        <div className="mt-5 grid grid-cols-3 sm:grid-cols-4 gap-3">
          {previews.map((src, i) => (
            <div key={src} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Preview ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {/* First image badge */}
              {i === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-blue-600/80 text-white text-[10px] font-medium text-center py-0.5">
                  Cover
                </div>
              )}
              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(i); }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-gray-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                aria-label="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Add more button */}
          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-blue-500 transition-colors"
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-[10px] font-medium">Add more</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
