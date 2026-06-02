import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Trophy, Calendar, FileText } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';

export default function StudentDetails() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentDetails();
  }, [studentId]);

  const loadStudentDetails = async () => {
    try {
      const res = await api.get(`/parents/students/${studentId}`);
      setStudent(res.data.student);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load student details');
      navigate('/parent/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Student not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/parent/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title={student.name}
          description={`${student.className} ${student.section ? `(${student.section})` : ''}`}
        />
      </div>

      <ErpSection title="Student Overview" icon={FileText} tone="blue">
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Roll No</div>
            <div className="text-2xl font-bold text-slate-900">{student.rollNo}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Rank</div>
            <div className="text-2xl font-bold text-slate-900">#{student.rank}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Percentage</div>
            <div className="text-2xl font-bold text-slate-900">{student.percentage}%</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Average</div>
            <div className="text-2xl font-bold text-slate-900">{student.average}</div>
          </div>
        </div>
      </ErpSection>

      <ErpSection title="Results" icon={Trophy} tone="yellow">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Button
            onClick={() => navigate(`/parent/student/${studentId}/daily-tests`)}
            className="h-24 flex flex-col items-center justify-center gap-2"
            variant="outline"
          >
            <Calendar className="h-8 w-8" />
            <span className="font-semibold">Daily Tests</span>
          </Button>
          <Button
            onClick={() => navigate(`/parent/student/${studentId}/main-exams`)}
            className="h-24 flex flex-col items-center justify-center gap-2"
            variant="outline"
          >
            <FileText className="h-8 w-8" />
            <span className="font-semibold">Main Exams</span>
          </Button>
        </div>
      </ErpSection>

      <ErpSection title="Recent Daily Tests" icon={Calendar} tone="green">
        {student.recentDailyTests && student.recentDailyTests.length > 0 ? (
          <div className="divide-y">
            {student.recentDailyTests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium text-slate-900">{test.subject}</div>
                  <div className="text-sm text-slate-500">{test.date}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-slate-900">{test.marksObtained} / {test.maxMarks}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500">
            No recent daily tests available
          </div>
        )}
      </ErpSection>
    </div>
  );
}
