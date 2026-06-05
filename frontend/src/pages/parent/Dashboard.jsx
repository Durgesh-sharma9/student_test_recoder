import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, Users, Trophy, ArrowRight, User } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';

export default function ParentDashboard() {
  const [students, setStudents] = useState([]);
  const [sessionName, setSessionName] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const res = await api.get('/parents/students');
      console.log('Parent students response:', res.data);
      setStudents(res.data.students || []);
      setSessionName(res.data.sessionName || '2026-27');
    } catch (err) {
      console.error('Failed to load students:', err);
      toast.error(err.response?.data?.message || 'Failed to load students');
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parent Dashboard"
        description={`Session: ${sessionName}`}
      />

      <ErpSection title="My Children" icon={Users} tone="blue">
        {students.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>No children linked to your account yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <div
                key={student._id}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="mb-4 flex items-start gap-4">
                  <div className="h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-900 truncate">{student.name}</h3>
                    <p className="text-sm text-slate-500">
                      {student.className} {student.section && `(${student.section})`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs font-medium text-slate-500 mb-1">Roll No</div>
                    <div className="text-lg font-bold text-slate-900">{student.rollNo}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs font-medium text-slate-500 mb-1">Rank</div>
                    <div className="text-lg font-bold text-slate-900">#{student.rank || '-'}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs font-medium text-slate-500 mb-1">Total Students</div>
                    <div className="text-lg font-bold text-slate-900">{student.totalStudents || '-'}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs font-medium text-slate-500 mb-1">Overall %</div>
                    <div className="text-lg font-bold text-slate-900">{student.percentage}%</div>
                  </div>
                </div>

                <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-3 mb-4">
                  <div className="text-xs font-medium text-indigo-600 mb-1">Last Test Score</div>
                  <div className="text-lg font-bold text-indigo-700">
                    {student.lastTestScore !== null ? `${student.lastTestScore.toFixed(1)}%` : 'N/A'}
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => navigate(`/parent/student/${student._id}/results-history`)}
                >
                  View Results
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ErpSection>
    </div>
  );
}
