import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, User, ChevronDown, TrendingUp, Calendar, ArrowRight, X } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function NotebookAnalytics() {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

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

  useEffect(() => {
    if (selectedStudentId) {
      loadProgress(selectedStudentId);
    }
  }, [selectedStudentId]);

  const loadStudents = async () => {
    try {
      const res = await api.get('/parents/students');
      setStudents(res.data.students || []);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async (studentId) => {
    try {
      const res = await api.get(`/notebook/parent/${studentId}`);
      setProgressData(res.data);
    } catch (err) {
      console.error('Failed to load notebook progress:', err);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return 'bg-emerald-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getProgressTextColor = (percentage) => {
    if (percentage >= 90) return 'text-emerald-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getStatusBadge = (percentage) => {
    if (percentage >= 90) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (percentage >= 75) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (percentage >= 50) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-rose-100 text-rose-700 border-rose-200';
  };

  const getStatusText = (percentage) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 75) return 'Good';
    if (percentage >= 50) return 'Average';
    return 'Needs Improvement';
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-slate-500">Loading...</div></div>;

  const selectedStudent = students.find(s => s._id === selectedStudentId);

  // Calculate summary data
  const totalSubjects = progressData?.subjectProgress?.length || 0;
  const totalPending = progressData?.subjectProgress?.reduce((acc, s) => acc + s.pending, 0) || 0;
  const overallCompletion = progressData?.overallPercentage || 0;

  // Get pending chapters for display
  const pendingChapters = progressData?.subjectProgress?.reduce((acc, subject) => {
    const pending = subject.chaptersDetail
      .filter(ch => ch.isUnlocked && ch.status === 'Pending')
      .map(ch => ({ subject: subject.subject, chapter: ch.chapterNumber }));
    return [...acc, ...pending];
  }, []) || [];

  // Get recent activity (simulated from chapter details)
  const recentActivity = progressData?.subjectProgress?.reduce((acc, subject) => {
    const checked = subject.chaptersDetail
      .filter(ch => ch.isUnlocked && ch.status === 'Checked')
      .map(ch => ({ 
        subject: subject.subject, 
        chapter: ch.chapterNumber,
        status: 'Checked',
        date: new Date().toISOString().split('T')[0] // Would come from backend in real implementation
      }));
    return [...acc, ...checked.slice(-2)]; // Last 2 checked per subject
  }, []) || [];

  const sortedRecentActivity = recentActivity.slice(-5).reverse();

  return (
    <PageStack className="gap-3 sm:gap-6 bg-gradient-to-b from-[#f8fbff] via-[#f5f8ff] via-[#f8faff] via-[#fcfdff] to-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader title="Notebook Analytics" description="Track your child's notebook checking progress across all subjects" />

        {students.length > 1 && (
          <div className="flex items-center self-start sm:self-auto bg-white border border-slate-200/90 hover:border-indigo-300 px-3.5 py-1.5 rounded-full shadow-xs transition-all cursor-pointer">
            <User className="h-4 w-4 text-indigo-600 mr-2 shrink-0" />
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="h-7 text-xs sm:text-sm font-extrabold text-slate-800 border-none shadow-none focus:ring-0 focus:outline-hidden bg-transparent p-0 gap-2">
                <SelectValue placeholder="Select Child" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-2xl">
                {students.map((s) => (
                  <SelectItem key={s._id} value={s._id} className="text-xs sm:text-sm font-bold">
                    {s.name} ({s.className}{s.section && `-${s.section}`})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {students.length === 0 ? (
        <ErpSection title="My Children" icon={User} tone="blue">
          <div className="p-6 sm:p-8 text-center text-slate-500">
            <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-xs sm:text-sm">No children linked to your account yet.</p>
          </div>
        </ErpSection>
      ) : (
        selectedStudent && progressData && (
          <>
            {/* Streamlined Notebook Progress Hero Card */}
            <ErpSection title="Notebook Progress Overview" icon={TrendingUp} tone="blue">
              <div className="p-3 sm:p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                  <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 to-purple-50/70 p-2.5 sm:p-3.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-600">Overall Completion</span>
                    </div>
                    <div className="text-base sm:text-2xl font-extrabold text-indigo-950">{overallCompletion}%</div>
                  </div>

                  <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-green-50/70 p-2.5 sm:p-3.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-600">Checked Chapters</span>
                    </div>
                    <div className="text-base sm:text-2xl font-extrabold text-emerald-950">
                      {progressData.subjectProgress.reduce((acc, s) => acc + s.checked, 0)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-orange-50/70 p-2.5 sm:p-3.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-600">Pending Chapters</span>
                    </div>
                    <div className="text-base sm:text-2xl font-extrabold text-amber-950">{totalPending}</div>
                  </div>

                  <div className="rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 to-sky-50/70 p-2.5 sm:p-3.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-600">Total Subjects</span>
                    </div>
                    <div className="text-base sm:text-2xl font-extrabold text-blue-950">{totalSubjects}</div>
                  </div>
                </div>
              </div>
            </ErpSection>

            {/* Overall Progress Ring Chart */}
            <ErpSection title="Overall Notebook Progress" icon={TrendingUp} tone="purple">
              <div className="p-4 sm:p-5">
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-8">
                  {/* Left: Progress Ring SVG Graph */}
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-full flex items-center justify-center shadow-md">
                      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#E8ECF7" strokeWidth="10" strokeLinecap="round" />
                      </svg>
                      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                        <defs>
                          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#4F46E5" />
                            <stop offset="100%" stopColor="#7C3AED" />
                          </linearGradient>
                        </defs>
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke="url(#progressGradient)"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={`${overallCompletion * 2.64} 264`}
                        />
                      </svg>
                      <div className="flex flex-col items-center">
                        <span className="text-2xl sm:text-3xl font-extrabold text-[#111827]">{overallCompletion}%</span>
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-500">Completion</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Chapter Breakdown */}
                  <div className="flex-1 w-full max-w-xs space-y-2">
                    <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-2.5 flex items-center gap-3 shadow-2xs">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-base font-extrabold text-emerald-800">
                          {progressData.subjectProgress.reduce((acc, s) => acc + s.checked, 0)}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-600">Checked Chapters</div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-2.5 flex items-center gap-3 shadow-2xs">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Clock className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-base font-extrabold text-amber-800">{totalPending}</div>
                        <div className="text-[11px] font-semibold text-amber-600">Pending Chapters</div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-2.5 flex items-center gap-3 shadow-2xs">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-base font-extrabold text-blue-800">
                          {progressData.subjectProgress.reduce((acc, s) => acc + s.checked, 0) + totalPending}
                        </div>
                        <div className="text-[11px] font-semibold text-blue-600">Total Chapters</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ErpSection>

            {/* Subject Grid */}
              <ErpSection title="Subject Progress" icon={BookOpen} tone="blue">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {progressData.subjectProgress.map((subject) => (
                    <div
                      key={subject.subject}
                      className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-4 cursor-pointer"
                      onClick={() => {
                        setSelectedSubject(subject);
                        setDetailsModalOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-blue-600" />
                          <h3 className="text-sm font-bold text-slate-900">{subject.subject}</h3>
                        </div>
                        <span className={cn('px-2 py-0.5 text-[10px] font-bold rounded-full border', getStatusBadge(subject.percentage))}>
                          {getStatusText(subject.percentage)}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600">Progress</span>
                          <span className={cn('font-bold', getProgressTextColor(subject.percentage))}>{subject.percentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full transition-all duration-500', getProgressColor(subject.percentage))}
                            style={{ width: `${subject.percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="text-center p-2 bg-slate-50 rounded-lg">
                          <div className="text-sm font-bold text-slate-900">{subject.unlockedChapters?.length || 0}</div>
                          <div className="text-[10px] text-slate-500">Unlocked</div>
                        </div>
                        <div className="text-center p-2 bg-slate-50 rounded-lg">
                          <div className="text-sm font-bold text-emerald-600">{subject.checked}</div>
                          <div className="text-[10px] text-slate-500">Checked</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Pending: {subject.pending}</span>
                        <span>Last Checked: Today</span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600">View Details</span>
                          <ArrowRight className="h-3 w-3 text-indigo-600" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ErpSection>

              {/* Progress Graph */}
              <ErpSection title="Progress by Subject" icon={TrendingUp} tone="green">
                <div className="space-y-3">
                  {progressData.subjectProgress.map((subject) => (
                    <div key={subject.subject} className="flex items-center gap-3">
                      <div className="w-24 text-xs font-medium text-slate-600 truncate">{subject.subject}</div>
                      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full transition-all duration-500', getProgressColor(subject.percentage))}
                          style={{ width: `${subject.percentage}%` }}
                        />
                      </div>
                      <div className={cn('w-12 text-right text-xs font-bold', getProgressTextColor(subject.percentage))}>
                        {subject.percentage}%
                      </div>
                    </div>
                  ))}
                </div>
              </ErpSection>

              {/* Pending Chapters */}
              {pendingChapters.length > 0 && (
                <ErpSection title="Pending Chapters" icon={Clock} tone="amber">
                  <div className="space-y-2">
                    {pendingChapters.slice(0, 10).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-slate-700">{item.subject}</span>
                        </div>
                        <span className="text-xs font-semibold text-amber-700">Chapter {item.chapter}</span>
                      </div>
                    ))}
                  </div>
                </ErpSection>
              )}

              {/* Recent Activity */}
              {sortedRecentActivity.length > 0 && (
                <ErpSection title="Recent Notebook Checking" icon={Calendar} tone="emerald">
                  <div className="space-y-3">
                    {sortedRecentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-700">
                            {activity.subject} notebook {activity.status === 'Checked' ? 'checked' : 'pending'}
                          </div>
                          <div className="text-xs text-slate-500">Chapter {activity.chapter}</div>
                        </div>
                        <div className="text-xs text-slate-400">{activity.date}</div>
                      </div>
                    ))}
                  </div>
                </ErpSection>
              )}
            </>
          )
      )}

      {/* View Details Modal */}
      {detailsModalOpen && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-white" />
                <h3 className="text-base font-bold text-white">{selectedSubject.subject}</h3>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500 mb-1">Total Chapters</div>
                    <div className="text-lg font-bold text-slate-900">{selectedSubject.totalChapters}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500 mb-1">Unlocked Chapters</div>
                    <div className="text-lg font-bold text-slate-900">{selectedSubject.unlockedChapters?.length || 0}</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <div className="text-xs text-emerald-600 mb-1">Checked Chapters</div>
                    <div className="text-lg font-bold text-emerald-700">{selectedSubject.checked}</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <div className="text-xs text-amber-600 mb-1">Pending Chapters</div>
                    <div className="text-lg font-bold text-amber-700">{selectedSubject.pending}</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Chapter-wise Status</h4>
                  <div className="space-y-2">
                    {selectedSubject.chaptersDetail.map((chapter) => (
                      <div
                        key={chapter.chapterNumber}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-lg border',
                          !chapter.isUnlocked ? 'bg-slate-50 border-slate-200 opacity-50' :
                          chapter.status === 'Checked' ? 'bg-emerald-50 border-emerald-200' :
                          'bg-amber-50 border-amber-200'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {!chapter.isUnlocked ? (
                            <span className="text-slate-400">🔒</span>
                          ) : chapter.status === 'Checked' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-600" />
                          )}
                          <span className="text-sm font-medium text-slate-700">Chapter {chapter.chapterNumber}</span>
                        </div>
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          !chapter.isUnlocked ? 'bg-slate-200 text-slate-500' :
                          chapter.status === 'Checked' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-amber-100 text-amber-700'
                        )}>
                          {!chapter.isUnlocked ? 'Locked' : chapter.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageStack>
  );
}
