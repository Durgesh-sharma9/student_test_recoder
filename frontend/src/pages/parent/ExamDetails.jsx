import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Trophy, Award } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';

export default function ExamDetails() {
  const { studentId, examType } = useParams();
  const navigate = useNavigate();
  const [examDetails, setExamDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExamDetails();
  }, [studentId, examType]);

  const loadExamDetails = async () => {
    try {
      const res = await api.get(`/parents/students/${studentId}/main-exams/${examType}`);
      setExamDetails(res.data.examDetails);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load exam details');
      navigate(`/parent/student/${studentId}/main-exams`);
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

  if (!examDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Exam details not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/parent/student/${studentId}/main-exams`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title={`${examDetails.examType} Results`}
          description="Subject-wise marks and performance"
        />
      </div>

      <ErpSection title="Overall Performance" icon={Trophy} tone="yellow">
        <div className="grid gap-4 p-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Total Obtained</div>
            <div className="text-2xl font-bold text-slate-900">{examDetails.totalObtained}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Total Max</div>
            <div className="text-2xl font-bold text-slate-900">{examDetails.totalMax}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Percentage</div>
            <div className="text-2xl font-bold text-slate-900">{examDetails.percentage}%</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Rank</div>
            <div className="text-2xl font-bold text-slate-900">#{examDetails.rank}</div>
          </div>
        </div>
      </ErpSection>

      <ErpSection title="Subject-wise Marks" icon={Award} tone="blue">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Subject</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Marks Obtained</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Max Marks</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Percentage</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Rank</th>
              </tr>
            </thead>
            <tbody>
              {examDetails.subjectMarks.map((subject, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-900">{subject.subject}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-900">{subject.marksObtained}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-900">{subject.maxMarks}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-900">{subject.percentage.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-900">#{subject.rankSubject}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ErpSection>
    </div>
  );
}
