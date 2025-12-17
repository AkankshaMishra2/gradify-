import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { UploadBox } from '@/components/UploadBox';
import { CameraCapture } from '@/components/CameraCapture';
import { ImagePreview } from '@/components/ImagePreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/context/AppContext';
import { uploadStudentSheet } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { FileImage, Upload, Camera, Loader2, ScanLine } from 'lucide-react';

export default function UploadSheet() {
  const [files, setFiles] = useState<File[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { setUploadedSheetFiles, setCurrentOCRResult } = useApp();
  const navigate = useNavigate();

  const handleFilesSelect = (selected: File[]) => {
    if (!selected.length) return;
    const totalRequested = files.length + selected.length;
    if (totalRequested > 50) {
      toast({
        title: 'File limit reached',
        description: 'Only the first 50 files were added.',
        variant: 'destructive',
      });
    }
    setFiles((prev) => {
      const next = [...prev];
      selected.forEach((file) => {
        if (next.length < 50) next.push(file);
      });
      if (prev.length === 0 && next.length > 0) {
        setActiveIndex(0);
      } else if (activeIndex >= next.length && next.length > 0) {
        setActiveIndex(next.length - 1);
      }
      return next;
    });
  };

  const handleCameraCapture = (capturedFile: File) => {
    handleFilesSelect([capturedFile]);
  };

  const handleClearFiles = () => {
    setFiles([]);
    setActiveIndex(0);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setActiveIndex(0);
      } else if (index === activeIndex) {
        setActiveIndex(Math.max(0, index - 1));
      } else if (index < activeIndex) {
        setActiveIndex((prevActive) => Math.max(0, prevActive - 1));
      }
      return next;
    });
  };

  const handleProcess = async () => {
    if (!files.length) return;

    setIsProcessing(true);

    try {
      const response = await uploadStudentSheet(files);
      if (response.answers) {
        setUploadedSheetFiles(files);
        setCurrentOCRResult({
          studentName: '',
          rollNo: '',
          answers: response.answers,
          rawText: response.rawText,
          confidence: response.confidence,
          pages: response.pages ?? [],
        });
        toast({
          title: 'Sheet Processed!',
          description: 'OCR extraction completed. Review the results.',
        });
        navigate('/ocr-result');
      } else {
        throw new Error('Processing failed');
      }
    } catch (error) {
      toast({
        title: 'Processing Failed',
        description: 'Failed to process the answer sheet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-lg mb-4">
              <FileImage className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Upload Student Sheet
            </h1>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Capture or upload a student's answer sheet for AI-powered evaluation.
            </p>
          </div>

          {/* Upload Card */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Student Answer Sheet</CardTitle>
              <CardDescription>
                Upload up to 50 PDF, DOC/DOCX, or image files for a single student
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="h-4 w-4" />
                    File Upload
                  </TabsTrigger>
                  <TabsTrigger value="camera" className="gap-2">
                    <Camera className="h-4 w-4" />
                    Camera
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload">
                  <UploadBox
                    multiple
                    onFilesSelect={handleFilesSelect}
                    selectedFiles={files}
                    onRemoveFile={handleRemoveFile}
                    onClearFile={handleClearFiles}
                    maxFiles={50}
                    acceptedTypes={[
                      'application/pdf',
                      'image/jpeg',
                      'image/png',
                      'application/msword',
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    ]}
                  />
                </TabsContent>

                <TabsContent value="camera">
                  <CameraCapture onCapture={handleCameraCapture} />
                </TabsContent>
              </Tabs>

              {files.length > 0 && (
                <>
                  <ImagePreview
                    file={files[activeIndex]}
                    onRemove={() => handleRemoveFile(activeIndex)}
                  />

                  {files.length > 1 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {files.map((f, idx) => (
                        <Button
                          key={`${f.name}-${f.lastModified}-${idx}`}
                          type="button"
                          variant={idx === activeIndex ? 'default' : 'outline'}
                          className="justify-start"
                          onClick={() => setActiveIndex(idx)}
                        >
                          <span className="truncate text-left">
                            Page {idx + 1}: {f.name}
                          </span>
                        </Button>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={handleProcess}
                    variant="gradient"
                    size="lg"
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing Sheets...
                      </>
                    ) : (
                      <>
                        <ScanLine className="h-5 w-5" />
                        Process {files.length} File{files.length > 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Processing Steps */}
          <div className="mt-8 p-6 rounded-xl bg-muted/50 border border-border">
            <h3 className="font-semibold text-foreground mb-4">What happens next:</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  1
                </div>
                <p className="text-sm text-muted-foreground">
                  OCR extracts text from the answer sheet
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  2
                </div>
                <p className="text-sm text-muted-foreground">
                  Review and edit extracted content if needed
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  3
                </div>
                <p className="text-sm text-muted-foreground">
                  AI evaluates answers against the answer key
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
