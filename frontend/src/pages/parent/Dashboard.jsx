import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, Users, Trophy, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';

export default function ParentDashboard() {
  const [students, setStudents] = useState([]);
  const [sessionName, setSessionName] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [topStudents, setTopStudents] = useState([]);
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
      setShowLeaderboard(res.data.showLeaderboard || false);
      setTopStudents(res.data.topStudents || []);
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
          <div className="space-y-6 p-4">
            {students.map((student) => (
              <div
                key={student._id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{student.name}</h3>
                    <p className="text-sm text-slate-500">
                      {student.className} {student.section && `(${student.section})`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/parent/student/${student._id}`)}
                  >
                    View Details
                  </Button>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Roll No:</span>
                    <span className="font-medium text-slate-900">{student.rollNo}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Rank:</span>
                    <span className="font-medium text-slate-900">#{student.rank}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Percentage:</span>
                    <span className="font-medium text-slate-900">{student.percentage}%</span>
                  </div>
                </div>

                {student.recentResults && student.recentResults.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Recent Results</h4>
                    <div className="space-y-2">
                      {student.recentResults.map((result, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm p-2 rounded bg-slate-50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500">{new Date(result.date).toLocaleDateString()}</span>
                            <span className="font-medium text-slate-900">{result.examType}</span>
                            <span className="text-slate-600">{result.subject}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-slate-900">{result.marksObtained}/{result.maxMarks}</span>
                            <span className="font-medium text-slate-900">{result.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ErpSection>
    </div>
  );
}
