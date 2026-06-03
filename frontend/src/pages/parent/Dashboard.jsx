import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, Users, Trophy, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';

export default function ParentDashboard() {
  const [students, setStudents] = useState([]);
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
        description="View your children's academic progress"
      />

      {showLeaderboard && topStudents.length > 0 && (
        <ErpSection title="🏆 Top 3 Students" icon={Trophy} tone="yellow">
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            {topStudents.map((name, index) => (
              <div key={index} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold">
                  {index + 1}
                </div>
                <span className="font-medium text-slate-900">{name}</span>
              </div>
            ))}
          </div>
        </ErpSection>
      )}

      <ErpSection title="My Children" icon={Users} tone="blue">
        {students.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>No children linked to your account yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <div
                key={student._id}
                onClick={() => navigate(`/parent/student/${student._id}`)}
                className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{student.name}</h3>
                    <p className="text-sm text-slate-500">
                      {student.className} {student.section && `(${student.section})`}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300 transition-colors group-hover:text-indigo-600" />
                </div>
                
                <div className="space-y-2">
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
              </div>
            ))}
          </div>
        )}
      </ErpSection>
    </div>
  );
}
