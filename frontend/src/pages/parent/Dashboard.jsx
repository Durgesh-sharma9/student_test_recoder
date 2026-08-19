import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, Users, TrendingUp, AlertTriangle, BookOpen } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '@/lib/api';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (students.length === 1) {
      setSelectedStudentId(students[0]._id);
    } else if (students.length > 1 && !selectedStudentId) {
      setSelectedStudentId(students[0]._id);
    }
  }, [students]);

  const loadStudents = async () => {
    try {
      const res = await api.get('/parents/students');
      setStudents(res.data.students || []);
      setSessionName(res.data.sessionName || '2026-27');
    } catch (err) {
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
        subjectMap[result.subject] = { subject: result.subject, totalPercentage: 0, count: 0 };
      }
      subjectMap[result.subject].totalPercentage += result.percentage || 0;
      subjectMap[result.subject].count += 1;
    });
    return Object.values(subjectMap).map(s => ({
      subject: s.subject,
      averagePercentage: s.count > 0 ? (s.totalPercentage / s.count).toFixed(1) : 0
    })).sort((a, b) => b.averagePercentage - a.averagePercentage);
  };

  const getWeakSubjects = (subjectPerformance) => {
    return subjectPerformance.filter(s => parseFloat(s.averagePercentage) < 50);
  };

  const formatDateSafe = (date) => {
    try {
      if (!date) return 'N/A';
      return formatDisplayDate(date);
    } catch { return 'N/A'; }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-slate-500">Loading...</div></div>;

  const selectedStudent = students.find(s => s._id === selectedStudentId);

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader title="Parent Dashboard" description={`Session: ${sessionName}`} />

      {students.length === 0 ? (
        <ErpSection title="My Children" icon={Users} tone="blue">
          <div className="p-6 sm:p-8 text-center text-slate-500">
            <GraduationCap className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-xs sm:text-sm">No children linked to your account yet.</p>
          </div>
        </ErpSection>
      ) : (
        <>
          {students.length > 1 && (
            <ErpSection title="Select Child" icon={Users} tone="blue">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 border border-blue-200/80 p-3 sm:p-4 rounded-xl shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-sm">
                    {selectedStudent?.name?.charAt(0).toUpperCase() || 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">{selectedStudent?.name}</h3>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/90 px-2 py-0.5 rounded-full border border-indigo-200">
                        Active Child
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {selectedStudent?.className} {selectedStudent?.section && `(${selectedStudent.section})`} • Roll No: {selectedStudent?.rollNo} • Rank: #{selectedStudent?.rank || '-'}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-64 shrink-0">
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger className="h-9 text-xs sm:text-sm font-semibold rounded-xl bg-white border-blue-200 shadow-xs focus:ring-2 focus:ring-blue-500/20">
                      <SelectValue placeholder="Switch Child" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s._id} value={s._id} className="text-xs sm:text-sm font-semibold">
                          {s.name} ({s.className} {s.section && `-${s.section}`})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ErpSection>
          )}

          {selectedStudent && (
            <ErpSection title={`${selectedStudent.name}'s Performance`} icon={GraduationCap} tone="blue">
              <div className="grid gap-4 sm:gap-8">
                {(() => {
                  const subjectPerformance = calculateSubjectPerformance(selectedStudent.recentResults);
                  const weakSubjects = getWeakSubjects(subjectPerformance);
                  const trendData = (selectedStudent.recentResults || []).slice(0, 10).reverse().map(r => ({
                    date: formatDateSafe(r.date),
                    percentage: r.percentage || 0
                  }));

                  return (
                    <div
                      key={selectedStudent._id}
                      onClick={() => navigate(`/parent/student/${selectedStudent._id}/results`)}
                      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 sm:p-8 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <div className="mb-3 sm:mb-5 flex items-center gap-2.5 sm:gap-6">
                        <div className="h-10 w-10 sm:h-20 sm:w-20 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm sm:text-2xl font-bold shadow-md">
                          {selectedStudent.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-2xl font-bold text-slate-900 truncate leading-tight">{selectedStudent.name}</h3>
                          <p className="text-xs sm:text-base text-slate-500 leading-tight">{selectedStudent.className} {selectedStudent.section && `(${selectedStudent.section})`}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-3 sm:mb-5">
                        <div className="rounded-xl bg-slate-50 p-2.5 sm:p-4"><div className="text-[11px] sm:text-sm font-semibold text-slate-500 mb-0.5">Roll No</div><div className="text-base sm:text-2xl font-extrabold text-slate-900">{selectedStudent.rollNo}</div></div>
                        <div className="rounded-xl bg-slate-50 p-2.5 sm:p-4"><div className="text-[11px] sm:text-sm font-semibold text-slate-500 mb-0.5">Rank</div><div className="text-base sm:text-2xl font-extrabold text-slate-900">#{selectedStudent.rank || '-'}</div></div>
                        <div className="rounded-xl bg-slate-50 p-2.5 sm:p-4"><div className="text-[11px] sm:text-sm font-semibold text-slate-500 mb-0.5">Total Students</div><div className="text-base sm:text-2xl font-extrabold text-slate-900">{selectedStudent.totalStudents || '-'}</div></div>
                        <div className="rounded-xl bg-slate-50 p-2.5 sm:p-4"><div className="text-[11px] sm:text-sm font-semibold text-slate-500 mb-0.5">Overall %</div><div className="text-base sm:text-2xl font-extrabold text-slate-900">{selectedStudent.percentage}%</div></div>
                      </div>

                      {trendData.length > 0 && (
                        <div className="mb-3 sm:mb-5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-2.5 sm:p-5">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3"><TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" /><span className="text-xs sm:text-sm font-bold text-indigo-600">Performance Trend</span></div>
                          <div className="w-full h-[110px] sm:h-[150px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="date" hide />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px' }} formatter={(value) => [`${value.toFixed(1)}%`, 'Score']} />
                                <Line type="monotone" dataKey="percentage" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', strokeWidth: 2, r: 3 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {subjectPerformance.length > 0 && (
                        <div className="mb-3 sm:mb-5 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 sm:p-5">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3"><BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" /><span className="text-xs sm:text-sm font-bold text-slate-700">Subject-wise Performance</span></div>
                          <div className="space-y-1.5 sm:space-y-2">
                            {subjectPerformance.slice(0, 4).map((sp, idx) => (
                              <div key={idx} className="flex items-center justify-between py-0.5">
                                <span className="text-xs sm:text-sm font-semibold text-slate-700">{sp.subject}</span>
                                <span className={`text-xs sm:text-sm font-bold ${parseFloat(sp.averagePercentage) >= 75 ? 'text-green-600' : parseFloat(sp.averagePercentage) >= 50 ? 'text-orange-600' : 'text-red-600'}`}>{sp.averagePercentage}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {weakSubjects.length > 0 && (
                        <div className="mb-1 rounded-xl bg-amber-50 border border-amber-200/80 p-2.5 sm:p-4">
                          <div className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 mt-0.5 shrink-0" /><div><p className="text-xs sm:text-sm font-bold text-amber-800">Needs Attention</p><p className="text-xs sm:text-sm text-amber-700 mt-0.5">{weakSubjects.map(s => s.subject).join(', ')}</p></div></div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </ErpSection>
          )}
        </>
      )}
    </div>
  );
}