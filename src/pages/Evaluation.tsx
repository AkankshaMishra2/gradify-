import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { EvaluationTable } from '@/components/EvaluationTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { downloadCsv } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { 
  Award, 
  Download, 
  ArrowLeft, 
  FileText, // This line is already present
  CheckCircle
} from 'lucide-react';

export default function Evaluation() {
  const { currentEvaluation } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentEvaluation) {
      navigate('/upload-sheet');
    }
  }, [currentEvaluation, navigate]);

  const handleViewDashboard = () => {
    toast({ title: 'Evaluation Complete', description: 'Result is saved automatically. Opening dashboard.' });
    navigate('/dashboard');
  };

  const handleExportCSV = () => {
    if (!currentEvaluation) return;

    downloadCsv();
    toast({
      title: 'CSV Downloaded',
      description: 'The evaluation result has been exported.',
    });
  };

  const handleDownloadJson = () => {
    if (!currentEvaluation?.examinerJson) return;
    const blob = new Blob([JSON.stringify(currentEvaluation.examinerJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluation_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'JSON Downloaded', description: 'Examiner JSON saved to your device.' });
  };

  if (!currentEvaluation) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/ocr-result')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-lg">
                  <Award className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground">
                    Evaluation Results
                  </h1>
                  <p className="text-muted-foreground">
                    AI-powered grading complete
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Evaluation Results */}
          <EvaluationTable evaluation={currentEvaluation} />

          {/* Examiner JSON Panel */}
          {currentEvaluation.examinerJson && (
            <Card className="mt-8 border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Examiner JSON</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  <AccordionItem value="json">
                    <AccordionTrigger>Show raw JSON</AccordionTrigger>
                    <AccordionContent>
                      <pre className="whitespace-pre-wrap break-words text-sm bg-muted/50 p-4 rounded-md">
                        {JSON.stringify(currentEvaluation.examinerJson, null, 2)}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 gap-2"
              onClick={handleExportCSV}
            >
              <Download className="h-5 w-5" />
              Download CSV
            </Button>
            {currentEvaluation.examinerJson && (
              <Button
                variant="outline"
                size="lg"
                className="flex-1 gap-2"
                onClick={handleDownloadJson}
              >
                <FileText className="h-5 w-5" />
                Download JSON
              </Button>
            )}
            
            <Button
              variant="success"
              size="lg"
              className="flex-1 gap-2 bg-success hover:bg-success/90"
              onClick={handleViewDashboard}
            >
              <CheckCircle className="h-5 w-5" />
              View in Dashboard
            </Button>
          </div>

          {/* Next Actions */}
          <div className="mt-8 p-6 rounded-xl bg-muted/50 border border-border">
            <h3 className="font-semibold text-foreground mb-4">What would you like to do next?</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 justify-start"
                onClick={() => navigate('/upload-sheet')}
              >
                <FileText className="h-5 w-5 mr-3 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Evaluate Another Sheet</p>
                  <p className="text-sm text-muted-foreground">Process more answer sheets</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 justify-start"
                onClick={() => navigate('/dashboard')}
              >
                <Award className="h-5 w-5 mr-3 text-primary" />
                <div className="text-left">
                  <p className="font-medium">View Dashboard</p>
                  <p className="text-sm text-muted-foreground">See all evaluated results</p>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
