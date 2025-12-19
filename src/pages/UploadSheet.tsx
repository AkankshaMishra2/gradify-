import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { UploadBox } from '@/components/UploadBox';
import { CameraCapture } from '@/components/CameraCapture';
import { ImagePreview } from '@/components/ImagePreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/context/AppContext';
import { uploadStudentSheet, batchUploadAndEvaluate, BatchEvaluationResponse } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { FileImage, Upload, Camera, Loader2, ScanLine, Users, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

type BatchEntry = {
  id: string;
  name: string;
  rollNumber: string;
  files: File[];
};

const MAX_BATCH_STUDENTS = 5;
const MAX_FILES_PER_STUDENT = 50;

const createBatchEntry = (): BatchEntry => ({
  id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2),
  name: '',
  rollNumber: '',
  files: [],
});

export default function UploadSheet() {
  const [files, setFiles] = useState<File[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSingleProcessing, setIsSingleProcessing] = useState(false);
  const [batchEntries, setBatchEntries] = useState<BatchEntry[]>([createBatchEntry()]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchEvaluationResponse | null>(null);
  const { setUploadedSheetFiles, setCurrentOCRResult, answerKeyId } = useApp();
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

    setIsSingleProcessing(true);

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
      setIsSingleProcessing(false);
    }
  };

  const handleBatchFieldChange = (id: string, field: 'name' | 'rollNumber', value: string) => {
    setBatchEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)));
  };

  const handleBatchFilesSelect = (id: string, selected: File[]) => {
    if (!selected.length) return;
    setBatchEntries((prev) => prev.map((entry) => {
      if (entry.id !== id) return entry;

      const nextFiles = [...entry.files];
      if (entry.files.length + selected.length > MAX_FILES_PER_STUDENT) {
        toast({
          title: 'File limit reached',
          description: `Only the first ${MAX_FILES_PER_STUDENT} files were added.`,
          variant: 'destructive',
        });
      }

      selected.forEach((file) => {
        if (nextFiles.length < MAX_FILES_PER_STUDENT) {
          nextFiles.push(file);
        }
      });

      return { ...entry, files: nextFiles };
    }));
  };

  const handleBatchClearFiles = (id: string) => {
    setBatchEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, files: [] } : entry)));
  };

  const handleBatchRemoveFile = (id: string, index: number) => {
    setBatchEntries((prev) => prev.map((entry) => {
      if (entry.id !== id) return entry;
      const nextFiles = entry.files.filter((_, idx) => idx !== index);
      return { ...entry, files: nextFiles };
    }));
  };

  const handleAddBatchEntry = () => {
    if (batchEntries.length >= MAX_BATCH_STUDENTS) {
      toast({
        title: 'Batch limit reached',
        description: `You can evaluate up to ${MAX_BATCH_STUDENTS} students at once.`,
        variant: 'destructive',
      });
      return;
    }
    setBatchEntries((prev) => [...prev, createBatchEntry()]);
  };

  const handleRemoveBatchEntry = (id: string) => {
    setBatchEntries((prev) => {
      const filtered = prev.filter((entry) => entry.id !== id);
      if (!filtered.length) {
        return [createBatchEntry()];
      }
      return filtered;
    });
  };

  const handleProcessBatch = async () => {
    if (!answerKeyId) {
      toast({
        title: 'Answer key required',
        description: 'Upload or select an answer key before running batch evaluation.',
        variant: 'destructive',
      });
      return;
    }

    const incompleteEntry = batchEntries.find((entry) => {
      const hasInput = entry.name.trim() || entry.rollNumber.trim() || entry.files.length;
      if (!hasInput) return false;
      return !(entry.name.trim() && entry.rollNumber.trim() && entry.files.length);
    });

    if (incompleteEntry) {
      toast({
        title: 'Incomplete student entry',
        description: 'Provide name, roll number, and at least one file for each student.',
        variant: 'destructive',
      });
      return;
    }

    const students = batchEntries.filter((entry) => entry.name.trim() && entry.rollNumber.trim() && entry.files.length);

    if (!students.length) {
      toast({
        title: 'No students to process',
        description: 'Add at least one complete student entry with files.',
        variant: 'destructive',
      });
      return;
    }

    setIsBatchProcessing(true);
    setBatchResults(null);

    try {
      const response = await batchUploadAndEvaluate(
        students.map(({ name, rollNumber, files: studentFiles }) => ({ name, rollNumber, files: studentFiles })),
        answerKeyId,
      );

      setBatchResults(response);

      const { successCount, failureCount } = response.summary;
      toast({
        title: 'Batch evaluation complete',
        description: failureCount
          ? `${successCount} succeeded, ${failureCount} failed. Review the results below.`
          : `All ${successCount} students evaluated successfully.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Batch processing failed';
      toast({
        title: 'Batch processing failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
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
                    disabled={isSingleProcessing}
                  >
                    {isSingleProcessing ? (
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

          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Batch Evaluate Students
              </CardTitle>
              <CardDescription>
                Evaluate up to {MAX_BATCH_STUDENTS} students in one go using your selected answer key.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge
                  variant="outline"
                  className={answerKeyId
                    ? 'flex items-center gap-2 border border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                    : 'flex items-center gap-2 border border-destructive/20 bg-destructive/10 text-destructive'}
                >
                  {answerKeyId ? 'Answer key ready' : 'Answer key not selected'}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Provide name, roll number, and up to {MAX_FILES_PER_STUDENT} files per student.
                </p>
              </div>

              <div className="space-y-4">
                {batchEntries.map((entry, index) => (
                  <div key={entry.id} className="space-y-4 rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold uppercase text-muted-foreground">
                        Student {index + 1}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveBatchEntry(entry.id)}
                        disabled={batchEntries.length === 1}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove student from batch"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`batch-name-${entry.id}`}>Student Name</Label>
                        <Input
                          id={`batch-name-${entry.id}`}
                          value={entry.name}
                          onChange={(e) => handleBatchFieldChange(entry.id, 'name', e.target.value)}
                          placeholder="e.g., Priya Sharma"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`batch-roll-${entry.id}`}>Roll Number</Label>
                        <Input
                          id={`batch-roll-${entry.id}`}
                          value={entry.rollNumber}
                          onChange={(e) => handleBatchFieldChange(entry.id, 'rollNumber', e.target.value)}
                          placeholder="e.g., R051"
                        />
                      </div>
                    </div>

                    <UploadBox
                      multiple
                      onFilesSelect={(selected) => handleBatchFilesSelect(entry.id, selected)}
                      selectedFiles={entry.files}
                      onRemoveFile={(fileIndex) => handleBatchRemoveFile(entry.id, fileIndex)}
                      onClearFile={() => handleBatchClearFiles(entry.id)}
                      maxFiles={MAX_FILES_PER_STUDENT}
                      acceptedTypes={[
                        'application/pdf',
                        'image/jpeg',
                        'image/png',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      ]}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddBatchEntry}
                  disabled={batchEntries.length >= MAX_BATCH_STUDENTS}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Student
                </Button>
                <Button
                  type="button"
                  variant="gradient"
                  className="min-w-[200px] flex-1 gap-2"
                  onClick={handleProcessBatch}
                  disabled={isBatchProcessing}
                >
                  {isBatchProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Evaluating batch...
                    </>
                  ) : (
                    <>
                      <Users className="h-5 w-5" />
                      Run batch evaluation
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {batchResults && (
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Batch Results</CardTitle>
                <CardDescription>Summary of your latest batch evaluation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>Successful: {batchResults.summary.successCount}</span>
                  <span>Failed: {batchResults.summary.failureCount}</span>
                </div>
                <div className="space-y-3">
                  {batchResults.results.map((result) => (
                    <div key={result.index} className="space-y-2 rounded-xl border p-4">
                      {result.status === 'success' ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-foreground">
                              {result.studentName} · {result.rollNumber}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Total Score: {result.totalScore}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 border border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Success
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-foreground">
                              {result.studentName || `Student ${result.index + 1}`}
                              {result.rollNumber ? ` · ${result.rollNumber}` : ''}
                            </p>
                            <p className="flex items-center gap-2 text-sm text-destructive">
                              <AlertTriangle className="h-4 w-4" />
                              {result.error}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="border border-destructive/20 bg-destructive/10 text-destructive"
                          >
                            Failed
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Go to dashboard
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Processing Steps */}
          <div className="rounded-xl border border-border bg-muted/50 p-6">
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
