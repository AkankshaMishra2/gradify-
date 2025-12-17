import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EvaluationResult } from '@/lib/api';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface EvaluationTableProps {
  evaluation: EvaluationResult;
}

export function EvaluationTable({ evaluation }: EvaluationTableProps) {
  const total = evaluation.totalScore || 0;
  const maxTotal = evaluation.details?.reduce((acc, d) => acc + (d.maxMarks || 0), 0) || 0;
  const percentage = maxTotal ? (total / maxTotal) * 100 : 0;
  const weakAreas = evaluation.weakAreas || [];
  const mappingDetails = evaluation.mappingDetails || [];
  const overallConfidence = typeof evaluation.overallConfidence === 'number' ? evaluation.overallConfidence : undefined;

  const getGrade = (pct: number) => {
    if (pct >= 90) return { grade: 'A+', color: 'bg-success text-success-foreground' };
    if (pct >= 80) return { grade: 'A', color: 'bg-success/80 text-success-foreground' };
    if (pct >= 70) return { grade: 'B', color: 'bg-primary text-primary-foreground' };
    if (pct >= 60) return { grade: 'C', color: 'bg-warning text-warning-foreground' };
    if (pct >= 50) return { grade: 'D', color: 'bg-warning/80 text-warning-foreground' };
    return { grade: 'F', color: 'bg-destructive text-destructive-foreground' };
  };

  const gradeInfo = getGrade(percentage);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="gradient-primary p-6 text-primary-foreground">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {/* Student name/roll may be available from page; hide if not present */}
              <h3 className="text-xl font-display font-bold">Evaluation</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {total}/{maxTotal}
                </div>
                <p className="text-sm text-primary-foreground/80">Total Marks</p>
              </div>
              <Badge className={`${gradeInfo.color} text-lg px-4 py-2 font-bold`}>
                {gradeInfo.grade}
              </Badge>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{percentage.toFixed(1)}%</span>
            </div>
            <Progress value={percentage} className="h-2 bg-primary-foreground/20" />
            {typeof overallConfidence === 'number' && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>Overall Confidence</span>
                <span className="font-semibold">{Math.round(overallConfidence * 100)}%</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Weak Areas + Mapping Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Weak Areas</CardTitle>
          </CardHeader>
          <CardContent>
            {weakAreas.length === 0 ? (
              <div className="text-sm text-muted-foreground">No weak areas detected from this submission.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {weakAreas.map((w) => (
                  <Badge key={w} variant="outline" className="px-3 py-1">
                    {w}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Mapping Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {mappingDetails.length === 0 ? (
              <div className="text-sm text-muted-foreground">No mapping details available.</div>
            ) : (
              <div className="space-y-3">
                {mappingDetails.slice(0, 6).map((m, idx) => (
                  <div key={`${m.sourceNumber || idx}-${m.matchedQuestionNumber || 'none'}`} className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
                    <div className="space-y-1">
                      <div className="font-medium">Input {m.sourceNumber || '—'} → {m.matchedQuestionNumber ? `Q${m.matchedQuestionNumber}` : 'Not mapped'}</div>
                      <div className="text-muted-foreground">{m.note || 'Mapping status'}</div>
                    </div>
                    <Badge variant={m.confidence >= 0.6 ? 'secondary' : 'destructive'} className="min-w-[64px] justify-center">
                      {Math.round((m.confidence || 0) * 100)}%
                    </Badge>
                  </div>
                ))}
                {mappingDetails.length > 6 && (
                  <div className="text-xs text-muted-foreground">Showing first 6 mappings.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results Table + Breakdown */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Question-wise Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {!evaluation.details || evaluation.details.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">No evaluation details available.</div>
          ) : (
            <>
              <div className="overflow-x-auto mb-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Question</TableHead>
                      <TableHead className="w-32">Marks</TableHead>
                      <TableHead>Concept Match</TableHead>
                      <TableHead>Missing Points</TableHead>
                      <TableHead>AI Explanation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluation.details.map((q, idx) => {
                      const qPercentage = q.maxMarks ? (q.score / q.maxMarks) * 100 : 0;
                      return (
                        <TableRow key={q.number || idx}>
                          <TableCell className="font-medium">
                            Q{q.number}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {q.score}/{q.maxMarks}
                              </span>
                              {qPercentage >= 80 ? (
                                <CheckCircle className="h-4 w-4 text-success" />
                              ) : qPercentage >= 50 ? (
                                <Info className="h-4 w-4 text-warning" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {q.conceptMatch || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {q.missingPoints || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {q.reason}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Expandable per-question breakdown */}
              <Accordion type="single" collapsible className="w-full">
                {evaluation.details.map((q, idx) => (
                  <AccordionItem value={`q-${q.number || idx}`} key={q.number || idx}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">Q{q.number}</span>
                        <span className="text-sm text-muted-foreground">Score: {q.score}/{q.maxMarks} {typeof q.percentage === 'number' ? `(${q.percentage}%)` : ''}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div className="p-3 rounded-md bg-muted/50">
                          <div className="font-medium mb-1">Student Answer</div>
                          <div className="text-muted-foreground break-words">{q.studentAnswer || '-'}</div>
                        </div>
                        <div className="p-3 rounded-md bg-muted/50">
                          <div className="font-medium mb-1">Correct Answer</div>
                          <div className="text-muted-foreground break-words">{q.correctAnswer || '-'}</div>
                        </div>
                        <div className="sm:col-span-2 p-3 rounded-md bg-muted/50">
                          <div className="font-medium mb-1">Concept Match</div>
                          <div className="text-muted-foreground break-words">{q.conceptMatch || '-'}</div>
                        </div>
                        <div className="sm:col-span-2 p-3 rounded-md bg-muted/50">
                          <div className="font-medium mb-1">Missing Points</div>
                          <div className="text-muted-foreground break-words">{q.missingPoints || '-'}</div>
                        </div>
                        <div className="sm:col-span-2 p-3 rounded-md bg-muted/50">
                          <div className="font-medium mb-1">AI Explanation</div>
                          <div className="text-muted-foreground break-words">{q.reason || '-'}</div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
