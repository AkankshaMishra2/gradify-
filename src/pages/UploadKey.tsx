import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { UploadBox } from '@/components/UploadBox';
import { ImagePreview } from '@/components/ImagePreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/context/AppContext';
import { uploadAnswerKey } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { FileKey, Upload, Loader2, CheckCircle } from 'lucide-react';

export default function UploadKey() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const { setUploadedKeyFile, setAnswerKeyId, isAuthenticated } = useApp();
  const navigate = useNavigate();

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setIsUploaded(false);
  };

  const handleClearFile = () => {
    setFile(null);
    setIsUploaded(false);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);

    try {
      const response = await uploadAnswerKey(file);
      if (response.keyId) {
        setAnswerKeyId(response.keyId);
        setUploadedKeyFile(file);
        setIsUploaded(true);
        toast({
          title: 'Success!',
          description: `Answer key uploaded. Parsed ${response.count} questions.`,
        });
      } else {
        throw new Error('Upload key failed');
      }
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload answer key. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
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
              <FileKey className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Upload Answer Key
            </h1>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Upload the model answer key that will be used to evaluate student responses.
            </p>
          </div>

          {/* Upload Card */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Answer Key Document</CardTitle>
              <CardDescription>
                Supported formats: PDF, DOC, DOCX, JPG, PNG (max 10MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!file ? (
                <UploadBox onFileSelect={handleFileSelect} />
              ) : (
                <>
                  <ImagePreview 
                    file={file} 
                    onRemove={handleClearFile}
                  />

                  {isUploaded ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-success">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Answer key uploaded successfully!</span>
                    </div>
                  ) : (
                    <Button
                      onClick={handleUpload}
                      variant="gradient"
                      size="lg"
                      className="w-full"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5" />
                          Upload & Save Answer Key
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}

              {isUploaded && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleClearFile}
                  >
                    Upload New Key
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => navigate('/upload-sheet')}
                  >
                    Continue to Upload Sheets
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <div className="mt-8 p-6 rounded-xl bg-muted/50 border border-border">
            <h3 className="font-semibold text-foreground mb-3">Tips for best results:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
                Ensure the answer key is clearly written or typed
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
                Include question numbers with corresponding answers
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
                Use high resolution images for better OCR accuracy
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
                Mark the maximum marks for each question if applicable
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
