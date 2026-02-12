import { useRef, useState } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_MB = 5;
const MAX_FILES = 10;

interface ImageUploadFieldProps {
  value: (string | File)[];
  onChange: (value: (string | File)[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export function ImageUploadField({
  value,
  onChange,
  disabled,
  maxFiles = MAX_FILES,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files || value.length >= maxFiles) return;
    const toAdd: File[] = [];
    for (let i = 0; i < files.length && value.length + toAdd.length < maxFiles; i++) {
      const file = files[i];
      if (ALLOWED_TYPES.includes(file.type) && file.size <= MAX_SIZE_MB * 1024 * 1024) {
        toAdd.push(file);
      }
    }
    if (toAdd.length > 0) {
      onChange([...value, ...toAdd]);
    }
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const previewUrl = (item: string | File): string => {
    if (typeof item === 'string') return item;
    return URL.createObjectURL(item);
  };

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && value.length < maxFiles && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
          dragActive && 'border-primary bg-primary/5',
          !dragActive && 'border-border hover:border-primary/50 hover:bg-muted/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
          disabled={disabled}
        />
        {value.length === 0 ? (
          <>
            <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop images or click to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, GIF, WebP • max {MAX_SIZE_MB}MB each • up to {maxFiles} images
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {value.length} image{value.length !== 1 ? 's' : ''} selected
            {value.length < maxFiles && ' • Click or drop to add more'}
          </p>
        )}
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {value.map((item, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
            >
              <img
                src={previewUrl(item)}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = 'none';
                  const fallback = img.parentElement?.querySelector('.img-fallback');
                  fallback?.classList.remove('hidden');
                }}
              />
              <div className="img-fallback hidden absolute inset-0 flex items-center justify-center bg-muted">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(index);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
