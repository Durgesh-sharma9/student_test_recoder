import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, FileText } from 'lucide-react';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';

export default function ParentMainExams() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMainExams();
  }, [studentId]);

  const loadMainExams = async () => {
    try {
      const res = await api.get(`/parents/students/${studentId}/main-exams`);
      setExams(res.data.exams || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load main exams');
    } finally {
      setLoading(false);
    }
  };

  const handleExamClick = (examType) => {
    navigate(`/parent/student/${studentId}/main-exams/${examType}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/parent/student/${studentId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title="Main Exams"
          description="View main exam results"
        />
      </div>

      <ErpSection title="Available Exams" icon={FileText} tone="purple">
        {exams.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No main exams available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-4 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => (
              <div
                key={exam.examType}
                onClick={() => handleExamClick(exam.examType)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md active:scale-[0.98] sm:active:scale-100"
              >
                <h3 className="text-base sm:text-lg font-bold text-slate-900 break-words">{exam.examType}</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {exam.examDate ? formatDisplayDate(exam.examDate) : 'No date'}
                </p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {exam.subjects.length} subject{exam.subjects.length !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </ErpSection>
    </div>
  );
}