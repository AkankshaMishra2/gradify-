import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStudentById, StudentRecord, getLatestEvaluationByStudent, type EvaluationResult, type EvaluationDetail } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<EvaluationResult | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      try {
        const s = await getStudentById(id);
        setStudent(s);
        const latest = await getLatestEvaluationByStudent(id);
        setRecord(latest.record);
      } catch (e) {
        console.error('Failed to fetch student', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-3xl font-bold">Student Details</h1>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !student ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 text-center text-muted-foreground">Student not found.</CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Evaluation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {(record?.details ?? []).map((detail: EvaluationDetail, idx: number) => {
                    const listKey = `${detail.number ?? `item-${idx}`}`;
                    return (
                      <li key={listKey} className="p-3 border rounded">
                        <div className="font-medium">Q{detail.number}</div>
                        <div>
                          Awarded: {detail.score} / {detail.maxMarks} {typeof detail.percentage === 'number' ? `(${detail.percentage}%)` : ''}
                        </div>
                        {detail.studentAnswer && <div>Student: {detail.studentAnswer}</div>}
                        {detail.correctAnswer && <div>Correct: {detail.correctAnswer}</div>}
                        {detail.conceptMatch && <div>Concept Match: {detail.conceptMatch}</div>}
                        {detail.missingPoints && <div>Missing Points: {detail.missingPoints}</div>}
                        {detail.reason && <div className="text-muted-foreground">Reason: {detail.reason}</div>}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
