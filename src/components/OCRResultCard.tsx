import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Hash, FileText, Edit3 } from 'lucide-react';
import { OCRResult } from '@/lib/api';

interface OCRResultCardProps {
  ocrData: OCRResult;
  onUpdate: (data: OCRResult) => void;
}

export function OCRResultCard({ ocrData, onUpdate }: OCRResultCardProps) {
  const [data, setData] = useState(ocrData);

  const handleStudentNameChange = (value: string) => {
    const updated = { ...data, studentName: value };
    setData(updated);
    onUpdate(updated);
  };

  const handleRollNoChange = (value: string) => {
    const updated = { ...data, rollNo: value };
    setData(updated);
    onUpdate(updated);
  };

  const handleAnswerChange = (questionNo: string | number, value: string) => {
    const updated = {
      ...data,
      answers: data.answers.map(a =>
        String(a.number ?? a.questionNo) === String(questionNo) ? { ...a, answer: value } : a
      ),
    };
    setData(updated);
    onUpdate(updated);
  };

  return (
    <div className="space-y-6">
      {/* Student Info Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Student Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="studentName" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Student Name
            </Label>
            <Input
              id="studentName"
              value={data.studentName}
              onChange={(e) => handleStudentNameChange(e.target.value)}
              placeholder="Enter student name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rollNo" className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              Roll Number
            </Label>
            <Input
              id="rollNo"
              value={data.rollNo}
              onChange={(e) => handleRollNoChange(e.target.value)}
              placeholder="Enter roll number"
            />
          </div>
        </CardContent>
      </Card>

      {/* Extracted Answers */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Extracted Answers
            </CardTitle>
            <Badge variant="secondary" className="gap-1">
              <Edit3 className="h-3 w-3" />
              Editable
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.answers.map((answer, idx) => {
            const qnum = String((answer as any).number ?? (answer as any).questionNo ?? idx + 1);
            const keyId = `${qnum}-${idx}`;
            const inputId = `q${qnum}-${idx}`;
            return (
            <div key={keyId} className="space-y-2">
              <Label 
                htmlFor={inputId}
                className="font-medium text-primary"
              >
                Question {qnum}
              </Label>
              <Textarea
                id={inputId}
                value={answer.answer}
                onChange={(e) => handleAnswerChange(qnum, e.target.value)}
                placeholder={`Answer for question ${qnum}`}
                rows={3}
                className="resize-none"
              />
            </div>
          );})}
        </CardContent>
      </Card>
    </div>
  );
}
