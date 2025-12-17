import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImagePreviewProps {
  file: File;
  onRemove?: () => void;
  className?: string;
}

export function ImagePreview({ file, onRemove, className }: ImagePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (file.type === 'application/pdf') {
      setPreviewUrl(null);
    }
  }, [file]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate max-w-[200px]">
            {file.name}
          </span>
          <span className="text-xs text-muted-foreground">
            ({(file.size / 1024).toFixed(1)} KB)
          </span>
        </div>
        <div className="flex items-center gap-1">
          {previewUrl && (
            <>
              <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleRotate} className="h-8 w-8">
                <RotateCw className="h-4 w-4" />
              </Button>
            </>
          )}
          {onRemove && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onRemove}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="relative h-64 sm:h-80 overflow-auto bg-muted/20 flex items-center justify-center">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
              <span className="text-2xl font-bold">PDF</span>
            </div>
            <p className="text-sm">{file.name}</p>
            <p className="text-xs">PDF preview not available</p>
          </div>
        )}
      </div>
    </div>
  );
}
