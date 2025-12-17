import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onCapture(files[0]);
    }
  };

  const handleClick = () => {
    // Try opening camera via getUserMedia; fallback to file input
    navigator.mediaDevices?.getUserMedia?.({ video: { facingMode: 'environment' } })
      .then((s) => {
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {
        inputRef.current?.click();
      });
  };

  const handleSnap = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
    }, 'image/jpeg', 0.95);
  };

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />
      {stream && (
        <div className="space-y-3">
          <video ref={videoRef} className="w-full rounded-md shadow" />
          <canvas ref={canvasRef} className="hidden" />
          <Button onClick={handleSnap} className="w-full">Snap & Use Photo</Button>
        </div>
      )}
      
      <Button
        onClick={handleClick}
        variant="outline"
        size="lg"
        className="w-full h-32 flex-col gap-3 border-2 border-dashed hover:border-primary hover:bg-primary/5"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Camera className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="font-medium">Capture from Camera</p>
          <p className="text-sm text-muted-foreground">Take a photo of the answer sheet</p>
        </div>
      </Button>
    </div>
  );
}
