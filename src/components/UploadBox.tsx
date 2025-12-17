import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DEFAULT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface UploadBoxProps {
  onFileSelect?: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  className?: string;
  selectedFile?: File | null;
  selectedFiles?: File[];
  onClearFile?: () => void;
  onRemoveFile?: (index: number) => void;
  multiple?: boolean;
  maxFiles?: number;
}

export function UploadBox({
  onFileSelect,
  onFilesSelect,
  acceptedTypes = DEFAULT_TYPES,
  maxSizeMB = 10,
  className,
  selectedFile,
  selectedFiles = [],
  onClearFile,
  onRemoveFile,
  multiple = false,
  maxFiles,
}: UploadBoxProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isTypeAllowed = (file: File) => {
    if (!acceptedTypes.length) return true;
    const fileType = file.type || '';
    return acceptedTypes.some((type) => type === fileType);
  };

  const validateFile = (file: File): boolean => {
    if (!isTypeAllowed(file)) {
      setError('Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG.');
      return false;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit.`);
      return false;
    }
    return true;
  };

  const handleValidFiles = (files: File[]) => {
    if (!files.length) return;
    setError(null);
    if (multiple) {
      onFilesSelect?.(files);
    } else if (files[0] && onFileSelect) {
      onFileSelect(files[0]);
    }
  };

  const handleCollection = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const valid: File[] = [];
    for (const file of incoming) {
      if (validateFile(file)) {
        valid.push(file);
      }
      if (maxFiles && selectedFiles.length + valid.length >= maxFiles) break;
    }
    handleValidFiles(valid);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleCollection(e.dataTransfer.files);
    }
  }, [selectedFiles.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleCollection(files);
      e.target.value = '';
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!multiple && selectedFile) {
    return (
      <div className={cn('rounded-xl border-2 border-success/30 bg-success/5 p-6', className)}>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
          </div>
          {onClearFile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearFile}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative cursor-pointer rounded-xl border-2 border-dashed p-8 transition-all duration-200',
          isDragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-muted/50',
          error && 'border-destructive bg-destructive/5'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4 text-center">
          <div className={cn('flex h-14 w-14 items-center justify-center rounded-full transition-colors', isDragOver ? 'bg-primary/10' : 'bg-muted')}>
            <Upload className={cn('h-6 w-6 transition-colors', isDragOver ? 'text-primary' : 'text-muted-foreground')} />
          </div>
          <div>
            <p className="font-medium text-foreground">{isDragOver ? 'Drop your files here' : multiple ? 'Drag & drop files here' : 'Drag & drop your file here'}</p>
            <p className="mt-1 text-sm text-muted-foreground">or click to browse</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>PDF, DOC, DOCX, JPG, PNG up to {maxSizeMB}MB each</span>
          </div>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <X className="h-4 w-4" />
          {error}
        </p>
      )}

      {multiple && selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Selected {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}</span>
            {onClearFile && (
              <Button variant="ghost" size="sm" onClick={onClearFile} className="h-8 px-2 text-xs">
                Clear all
              </Button>
            )}
          </div>
          <ul className="max-h-48 space-y-2 overflow-auto">
            {selectedFiles.map((file, index) => (
              <li
                key={`${file.name}-${file.lastModified}-${index}`}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                {onRemoveFile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveFile(index)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
