import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';

export default function NotebookProgress() {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

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
    if (percentage >= 75) return 'bg-emerald-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getProgressTextColor = (percentage) => {
    if (percentage >= 75) return 'text-emerald-600';
    if (percentage >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-slate-500">Loading...</div></div>;

  const selectedStudent = students.find(s => s._id === selectedStudentId);

  return (
    <PageStack>
      <PageHeader title="Notebook Progress" description="Track your child's notebook submission progress" />

      {students.length === 0 ? (
        <ErpSection title="My Children" icon={BookOpen} tone="blue">
          <div className="p-8 text-center text-slate-500">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>No children linked to your account yet.</p>
          </div>
        </ErpSection>
      ) : (
        <>
          {students.length > 1 && (
            <ErpSection title="Select Child" icon={BookOpen} tone="blue">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student) => (
                  <div
                    key={student._id}
                    onClick={() => setSelectedStudentId(student._id)}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                      selectedStudentId === student._id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 truncate">{student.name}</h3>
                        <p className="text-sm text-slate-500">{student.className} {student.section && `(${student.section})`}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ErpSection>
          )}

          {selectedStudent && progressData && (
            <>
              <ErpSection title={`${selectedStudent.name}'s Notebook Progress`} icon={BookOpen} tone="blue">
                <div className="mb-6 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Overall Progress</p>
                      <p className="text-3xl font-bold text-indigo-900">{progressData.overallPercentage}%</p>
                    </div>
                    <div className="h-16 w-16 rounded-full border-4 border-indigo-200 flex items-center justify-center">
                      <span className="text-lg font-bold text-indigo-600">{progressData.overallPercentage}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {progressData.subjectProgress.map((subject) => (
                    <div key={subject.subject} className="rounded-xl border border-slate-200 bg-white p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-slate-900">{subject.subject}</h3>
                        <span className={`text-2xl font-bold ${getProgressTextColor(subject.percentage)}`}>
                          {subject.percentage}%
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="rounded-lg bg-slate-50 p-3 text-center">
                          <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
                          <p className="text-xs text-slate-500">Checked</p>
                          <p className="text-lg font-bold text-slate-900">{subject.checked}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 text-center">
                          <Clock className="h-5 w-5 mx-auto mb-1 text-amber-600" />
                          <p className="text-xs text-slate-500">Pending</p>
                          <p className="text-lg font-bold text-slate-900">{subject.pending}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 text-center">
                          <XCircle className="h-5 w-5 mx-auto mb-1 text-rose-600" />
                          <p className="text-xs text-slate-500">Not Submitted</p>
                          <p className="text-lg font-bold text-slate-900">{subject.notSubmitted}</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-600">{subject.checked} / {subject.totalChapters} Chapters Checked</span>
                          <span className="text-slate-500">{subject.percentage}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(subject.percentage)} transition-all duration-500`}
                            style={{ width: `${subject.percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2 mt-4">
                        {subject.chaptersDetail.map((ch) => (
                          <div
                            key={ch.chapterNumber}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              ch.status === 'Checked' ? 'bg-emerald-500 text-white' :
                              ch.status === 'Copy Not Submitted' ? 'bg-rose-500 text-white' :
                              'bg-slate-100 text-slate-600'
                            }`}
                            title={`Chapter ${ch.chapterNumber}: ${ch.status}`}
                          >
                            {ch.status === 'Checked' ? '✔' : ch.status === 'Copy Not Submitted' ? '❌' : ch.chapterNumber}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ErpSection>
            </>
          )}
        </>
      )}
    </PageStack>
  );
}
