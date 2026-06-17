import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, Users, Trophy, ArrowRight, User, TrendingUp, AlertTriangle, BookOpen } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import api from '@/lib/api';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { formatDisplayDate } from '@/lib/dateFormatter';

const getExamTypeColor = (examType) => {
  if (examType === 'Daily Test') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (examType.startsWith('PA')) return 'bg-red-100 text-red-700 border-red-200';
  if (examType.startsWith('FA')) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (examType === 'Half Yearly') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (examType === 'Final') return 'bg-green-100 text-green-700 border-green-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

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

  const calculateSubjectPerformance = (recentResults) => {
    if (!recentResults || recentResults.length === 0) return [];

    const subjectMap = {};
    recentResults.forEach(result => {
      if (!subjectMap[result.subject]) {
        subjectMap[result.subject] = {
          subject: result.subject,
          totalPercentage: 0,
          count: 0,
          results: []
        };
      }
      subjectMap[result.subject].totalPercentage += result.percentage || 0;
      subjectMap[result.subject].count += 1;
      subjectMap[result.subject].results.push(result);
    });

    return Object.values(subjectMap).map(s => ({
      subject: s.subject,
      averagePercentage: s.count > 0 ? (s.totalPercentage / s.count).toFixed(1) : 0,
      count: s.count
    })).sort((a, b) => b.averagePercentage - a.averagePercentage);
  };

  const getWeakSubjects = (subjectPerformance) => {
    return subjectPerformance.filter(s => parseFloat(s.averagePercentage) < 50);
  };

  const formatDateSafe = (date) => {
    try {
      if (!date) return 'N/A';
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return formatDisplayDate(date);
    } catch {
      return 'N/A';
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
          <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
            {students.map((student) => {
              const subjectPerformance = calculateSubjectPerformance(student.recentResults);
              const weakSubjects = getWeakSubjects(subjectPerformance);
              const trendData = (student.recentResults || []).slice(0, 10).reverse().map(r => ({
                date: formatDateSafe(r.date),
                percentage: r.percentage || 0
              }));

              return (
                <div
                  key={student._id}
                  onClick={() => navigate(`/parent/student/${student._id}/results`)}
                  className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="mb-6 flex items-start gap-6">
                    <div className="h-20 w-20 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-bold text-slate-900 truncate">{student.name}</h3>
                      <p className="text-base text-slate-500">
                        {student.className} {student.section && `(${student.section})`}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-sm font-medium text-slate-500 mb-1">Roll No</div>
                      <div className="text-2xl font-bold text-slate-900">{student.rollNo}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-sm font-medium text-slate-500 mb-1">Rank</div>
                      <div className="text-2xl font-bold text-slate-900">#{student.rank || '-'}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-sm font-medium text-slate-500 mb-1">Total Students</div>
                      <div className="text-2xl font-bold text-slate-900">{student.totalStudents || '-'}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-sm font-medium text-slate-500 mb-1">Overall %</div>
                      <div className="text-2xl font-bold text-slate-900">{student.percentage}%</div>
                    </div>
                  </div>

                  {/* Performance Trend */}
                  {trendData.length > 0 && (
                    <div className="mb-6 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-5 w-5 text-indigo-600" />
                        <span className="text-sm font-medium text-indigo-600">Performance Trend</span>
                      </div>
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={trendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            hide={trendData.length > 5}
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 100]}
                            hide
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            formatter={(value) => [`${value.toFixed(1)}%`, 'Score']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="percentage" 
                            stroke="#6366f1" 
                            strokeWidth={2}
                            dot={{ fill: '#6366f1', strokeWidth: 2, r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Subject-wise Performance */}
                  {subjectPerformance.length > 0 && (
                    <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="h-5 w-5 text-slate-600" />
                        <span className="text-sm font-medium text-slate-600">Subject-wise Performance</span>
                      </div>
                      <div className="space-y-2">
                        {subjectPerformance.slice(0, 4).map((sp, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-sm text-slate-700">{sp.subject}</span>
                            <span className={`text-sm font-semibold ${
                              parseFloat(sp.averagePercentage) >= 75 ? 'text-green-600' :
                              parseFloat(sp.averagePercentage) >= 50 ? 'text-orange-600' :
                              'text-red-600'
                            }`}>
                              {sp.averagePercentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Weak Subjects Alert */}
                  {weakSubjects.length > 0 && (
                    <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">Needs Attention</p>
                          <p className="text-sm text-amber-700 mt-1">
                            {weakSubjects.map(s => s.subject).join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ErpSection>
    </div>
  );
}
