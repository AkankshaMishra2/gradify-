import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';
import { evaluateAnswers, OCRResult } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Send, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';

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
        description: 'Evaluation finished successfully.',
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
                Enter Student Details
              </h1>
              <p className="text-muted-foreground mt-1">
                Confirm the student information before running evaluation
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <Card className={`mb-6 ${lowConfidence ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20 bg-primary/5'}`}>
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle className={`h-5 w-5 ${lowConfidence ? 'text-destructive' : 'text-primary'} mt-0.5 shrink-0`} />
              <div className="text-sm">
                <p className="font-medium text-foreground">Review student details before continuing</p>
                {typeof ocrData.confidence === 'number' && (
                  <p className="text-xs text-muted-foreground mt-1">OCR confidence: {(ocrData.confidence * 100).toFixed(0)}%</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="student-name">Student Name</label>
                  <Input
                    id="student-name"
                    placeholder="Enter student name"
                    value={ocrData.studentName}
                    onChange={(event) => {
                      const next = { ...ocrData, studentName: event.target.value };
                      setOcrData(next);
                      setCurrentOCRResult(next);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="student-roll">Roll Number</label>
                  <Input
                    id="student-roll"
                    placeholder="Enter roll number"
                    value={ocrData.rollNo}
                    onChange={(event) => {
                      const next = { ...ocrData, rollNo: event.target.value };
                      setOcrData(next);
                      setCurrentOCRResult(next);
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
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
                      Send for Evaluation
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
