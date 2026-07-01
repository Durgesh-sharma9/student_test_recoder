import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Trophy, Calendar, FileText, FileCheck } from 'lucide-react';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateFormatter';
import AbsentBadge from '@/components/AbsentBadge';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function StudentDetails() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Notebook Check State
  const [notebookData, setNotebookData] = useState(null);
  const [loadingNotebook, setLoadingNotebook] = useState(false);

  useEffect(() => {
    loadStudentDetails();
    loadNotebookProgress();
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

  const loadNotebookProgress = async () => {
    setLoadingNotebook(true);
    try {
      const res = await api.get(`/notebook/parent/${studentId}`);
      if (res.data.success) {
        setNotebookData(res.data);
      }
    } catch (err) {
      console.error('Failed to load notebook details:', err);
    } finally {
      setLoadingNotebook(false);
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/parent/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title={student.name}
          description={`${student.className} ${student.section ? `(${student.section})` : ''}`}
        />
      </div>

      <ErpSection title="Student Overview" icon={FileText} tone="blue">
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 overflow-hidden">
            <div className="text-xs sm:text-sm text-slate-500 truncate">Roll No</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{student.rollNo}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 overflow-hidden">
            <div className="text-xs sm:text-sm text-slate-500 truncate">Rank</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 truncate">#{student.rank}</div>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 overflow-hidden">
            <div className="text-xs sm:text-sm text-slate-500 truncate">Percentage</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{student.percentage}%</div>
          </div>
        </div>
      </ErpSection>

      <ErpSection title="Notebook Checking Progress" icon={FileCheck} tone="fuchsia">
        {loadingNotebook ? (
          <div className="p-8 text-center text-slate-500">Loading notebook data...</div>
        ) : !notebookData || notebookData.subjectProgress?.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No notebook checking data available</div>
        ) : (
          <div className="space-y-4 p-3 sm:p-4">
            <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-4">
              <div className="text-sm font-semibold text-fuchsia-800 mb-1">Overall Notebook Checking Progress</div>
              <div className="text-2xl font-extrabold text-fuchsia-900">{notebookData.overallPercentage}%</div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">Checked</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead className="text-center">Not Submitted</TableHead>
                    <TableHead className="text-right">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notebookData.subjectProgress.map((subj, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{subj.subject}</TableCell>
                      <TableCell className="text-center font-semibold text-emerald-600">{subj.checked}</TableCell>
                      <TableCell className="text-center font-semibold text-amber-500">{subj.pending}</TableCell>
                      <TableCell className="text-center font-semibold text-rose-500">{subj.notSubmitted}</TableCell>
                      <TableCell className="text-right font-bold text-fuchsia-700">{subj.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </ErpSection>

      <ErpSection title="Results" icon={Trophy} tone="yellow">
        <div className="p-3 sm:p-4">
          <Button
            onClick={() => navigate(`/parent/student/${studentId}/results-history`)}
            className="w-full h-20 sm:h-24 flex flex-col items-center justify-center gap-2 rounded-xl"
            variant="outline"
          >
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="font-semibold text-sm sm:text-base">View Results History</span>
          </Button>
        </div>
      </ErpSection>

      <ErpSection title="Recent Results" icon={Calendar} tone="green">
        {student.recentResults && student.recentResults.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {student.recentResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 sm:p-4 gap-2 hover:bg-slate-50/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm sm:text-base text-slate-900 truncate" title={`${result.examType} - ${result.subject}`}>
                    {result.examType} - {result.subject}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500">{formatDisplayDate(result.date)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-medium text-sm sm:text-base text-slate-900">
                    {result.status === 'absent' ? <AbsentBadge /> : `${result.marksObtained} / ${result.maxMarks}`}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500">{result.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500">
            No recent results available
          </div>
        )}
      </ErpSection>
    </div>
  );
}