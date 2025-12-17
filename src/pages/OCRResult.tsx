import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { OCRResultCard } from '@/components/OCRResultCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/context/AppContext';
import { evaluateAnswers, OCRResult } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { ScanLine, Send, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';

export default function OCRResultPage() {
  const { currentOCRResult, setCurrentOCRResult, setCurrentEvaluation, answerKeyId } = useApp();
  const [ocrData, setOcrData] = useState<OCRResult | null>(currentOCRResult);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentOCRResult) {
      navigate('/upload-sheet');
    }
  }, [currentOCRResult, navigate]);

  const handleOCRUpdate = (updatedData: OCRResult) => {
    setOcrData(updatedData);
    setCurrentOCRResult(updatedData);
  };

  const handleEvaluate = async () => {
    if (!ocrData) return;

    const lowConfidence = typeof ocrData.confidence === 'number' && ocrData.confidence < 0.5;
    if (lowConfidence) {
      toast({
        title: 'OCR is too noisy',
        description: 'Please fix the extracted answers below before evaluating to ensure accurate grading.',
        variant: 'destructive',
      });
      return;
    }

    // Validation
    if (!ocrData.studentName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter the student name.',
        variant: 'destructive',
      });
      return;
    }

    if (!ocrData.rollNo.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter the roll number.',
        variant: 'destructive',
      });
      return;
    }

    setIsEvaluating(true);

    try {
      if (!answerKeyId) {
        toast({ title: 'Answer Key Missing', description: 'Please upload an answer key before evaluation.', variant: 'destructive' });
        setIsEvaluating(false);
        return;
      }
      const result = await evaluateAnswers({
        studentName: ocrData.studentName,
        rollNo: ocrData.rollNo,
        keyId: answerKeyId,
        answers: ocrData.answers,
      });
      setCurrentEvaluation(result);
      toast({
        title: 'Evaluation Complete!',
        description: 'AI has finished grading the answers.',
      });
      navigate('/evaluation');
    } catch (error) {
      toast({
        title: 'Evaluation Failed',
        description: 'Failed to evaluate answers. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!ocrData) return null;

  const lowConfidence = typeof ocrData.confidence === 'number' && ocrData.confidence < 0.5;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/upload-sheet')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                OCR Results
              </h1>
              <p className="text-muted-foreground mt-1">
                Review and edit the extracted content before evaluation
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <Card className={`mb-6 ${lowConfidence ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20 bg-primary/5'}`}>
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle className={`h-5 w-5 ${lowConfidence ? 'text-destructive' : 'text-primary'} mt-0.5 shrink-0`} />
              <div className="text-sm">
                <p className="font-medium text-foreground">{lowConfidence ? 'Low-confidence OCR — please correct before evaluating' : 'Review the extracted content'}</p>
                <p className="text-muted-foreground">
                  {lowConfidence
                    ? 'The extracted text looks noisy. Please fix the answers below for best grading accuracy.'
                    : 'Please verify and correct any OCR errors before sending for AI evaluation.'}
                </p>
                {typeof ocrData.confidence === 'number' && (
                  <p className="text-xs text-muted-foreground mt-1">OCR confidence: {(ocrData.confidence * 100).toFixed(0)}%</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* OCR Results */}
          <OCRResultCard ocrData={ocrData} onUpdate={handleOCRUpdate} />

          {/* Raw OCR Text Preview */}
          {ocrData.rawText && (
            <Card className="mt-6 border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Raw OCR Text</CardTitle>
                <CardDescription>
                  Direct text extracted from the uploaded sheet (may include OCR noise)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap break-words text-sm bg-muted/50 p-4 rounded-md">
                  {ocrData.rawText}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => navigate('/upload-sheet')}
            >
              <ArrowLeft className="h-5 w-5" />
              Upload Different Sheet
            </Button>
            <Button
              variant="gradient"
              size="lg"
              className="flex-1"
              onClick={handleEvaluate}
              disabled={isEvaluating}
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Send for AI Evaluation
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
