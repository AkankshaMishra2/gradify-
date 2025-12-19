import { useCallback, useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { DashboardTable } from '@/components/DashboardTable';
import { Card, CardContent } from '@/components/ui/card';
import { useApp } from '@/context/AppContext';
import { getDashboardData, deleteStudent } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Loader2
} from 'lucide-react';

export default function Dashboard() {
  const { isAuthenticated, students, setStudents } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const data = await getDashboardData();
      setStudents(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setStudents]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchData();
  }, [fetchData, isAuthenticated, navigate]);

  const handleDeleteStudent = async (id: string) => {
    try {
      await deleteStudent(id);
      toast({
        title: "Student deleted",
        description: "The student record has been permanently deleted.",
      });
      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Failed to delete student:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete student record.",
      });
    }
  };

  if (!isAuthenticated) return null;

  const stats = [
    {
      title: 'Total Students',
      value: students.length,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Evaluated',
      value: students.filter(s => s.status === 'evaluated').length,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Pending',
      value: students.filter(s => s.status === 'pending').length,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Average Score',
      value: students.filter(s => s.status !== 'pending').length > 0
        ? `${Math.round(
            students
              .filter(s => s.status !== 'pending')
              .reduce((acc, s) => acc + (s.totalMarks / s.maxMarks) * 100, 0) /
            students.filter(s => s.status !== 'pending').length
          )}%`
        : '-',
      icon: TrendingUp,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of all evaluated student answer sheets
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map((stat) => (
                <Card key={stat.title} className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor}`}>
                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Results Table */}
            <DashboardTable students={students} onDelete={handleDeleteStudent} />
          </>
        )}
      </main>
    </div>
  );
}
