import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentRecord, downloadCsv } from '@/lib/api';
import { Search, Download, Filter, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DashboardTableProps {
  students: StudentRecord[];
  onDelete?: (id: string) => void;
}

export function DashboardTable({ students, onDelete }: DashboardTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const navigate = useNavigate();

  // Get all unique question numbers from all students
  const allQuestions = Array.from(new Set(students.flatMap(s => s.evaluatedMarks?.map(m => m.number) || [])))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const getMaxMarksForQuestion = (qNum: string) => {
    const studentWithQ = students.find(s => s.evaluatedMarks?.some(m => m.number === qNum));
    return studentWithQ?.evaluatedMarks?.find(m => m.number === qNum)?.maxMarks || 0;
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus =
      statusFilter === 'all' || student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'evaluated':
        return <Badge className="bg-success/10 text-success hover:bg-success/20">Evaluated</Badge>;
      case 'reviewed':
        return <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Reviewed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleExport = () => {
    downloadCsv();
  };

  const handleDelete = (id: string) => {
    if (onDelete) {
      onDelete(id);
      setStudentToDelete(null);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-xl font-display">Student Results</CardTitle>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="evaluated">Evaluated</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Roll No</TableHead>
                {allQuestions.map(q => (
                  <TableHead key={q} className="text-center whitespace-nowrap">
                    Q{q} <span className="text-xs text-muted-foreground">({getMaxMarksForQuestion(q)})</span>
                  </TableHead>
                ))}
                <TableHead className="text-center">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5 + allQuestions.length} className="text-center py-8 text-muted-foreground">
                    No students found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student._id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-muted-foreground">{student.rollNumber}</TableCell>
                    {allQuestions.map((q) => {
                      const mark = student.evaluatedMarks?.find(m => m.number === q);
                      return (
                        <TableCell key={q} className="text-center">
                          {student.status === 'pending' || !mark ? '-' : mark.score}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-semibold">
                      {student.status === 'pending' 
                        ? '-' 
                        : `${student.totalScore} / ${student.evaluatedMarks?.reduce((acc, curr) => acc + (curr.maxMarks || 0), 0) || 0}`}
                    </TableCell>
                    <TableCell>{getStatusBadge(student.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={student.status === 'pending'}
                          className="gap-1"
                          onClick={() => navigate(`/students/${student._id}`)}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <AlertDialog open={studentToDelete === student._id} onOpenChange={(open) => setStudentToDelete(open ? student._id : null)}>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the student record for <strong>{student.name}</strong>.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(student._id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-muted-foreground">
          <span>
            Showing {filteredStudents.length} of {students.length} students
          </span>
          <div className="flex gap-4">
            <span>Evaluated: {students.filter(s => s.status === 'evaluated').length}</span>
            <span>Reviewed: {students.filter(s => s.status === 'reviewed').length}</span>
            <span>Pending: {students.filter(s => s.status === 'pending').length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
