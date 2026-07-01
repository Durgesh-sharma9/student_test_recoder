import { useEffect, useState } from 'react';
import { BookOpen, Activity, AlertTriangle, Lock, AlertCircle, FileCheck } from 'lucide-react';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { useAuth } from '@/context/AuthContext';
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry';
import StatsCard from '@/components/StatsCard';
import AbsentBadge from '@/components/AbsentBadge';
import { PageHeader, ErpSection, PageStack, FormField } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import SubscriptionExpiredDialog from '@/components/subscription/SubscriptionExpiredDialog';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { isSubscriptionExpired, dialogOpen: expiredDialogOpen, setDialogOpen: setExpiredDialogOpen, checkAndBlock } = useSubscriptionExpiry();
  const navigate = useNavigate();
  const [data, setData] = useState({ stats: {}, recentActivities: [], weakStudents: [], assignmentDetails: [] });
  const [weakStudentsData, setWeakStudentsData] = useState([]);
  const [loadingWeakStudents, setLoadingWeakStudents] = useState(false);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [dateType, setDateType] = useState('specific');
  const [specificDate, setSpecificDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [topCount, setTopCount] = useState('5');

  // Notebook Analytics State
  const [nbClass, setNbClass] = useState('');
  const [nbSubject, setNbSubject] = useState('');
  const [notebookStats, setNotebookStats] = useState(null);
  const [loadingNotebook, setLoadingNotebook] = useState(false);

  useEffect(() => { api.get('/results/dashboard').then((r) => setData(r.data)); }, []);
  const s = data.stats || {};
  const assignments = data.assignmentDetails || [];

  const fetchWeakStudents = async () => {
    if (!selectedClass || !selectedSubject) {
      alert('Please select Class and Subject');
      return;
    }
    if (dateType === 'specific' && !specificDate) {
      alert('Please select a date');
      return;
    }
    if (dateType === 'range' && (!dateFrom || !dateTo)) {
      alert('Please select date range');
      return;
    }

    setLoadingWeakStudents(true);
    try {
      const params = new URLSearchParams();
      params.append('classId', selectedClass);
      params.append('subject', selectedSubject);
      params.append('topCount', topCount);
      
      if (dateType === 'specific') {
        params.append('testDate', specificDate);
      } else {
        params.append('dateFrom', dateFrom);
        params.append('dateTo', dateTo);
      }

      const res = await api.get(`/results/weak-students?${params}`);
      setWeakStudentsData(res.data.weakStudents || []);
    } catch (err) {
      console.error('Failed to fetch weak students:', err);
      alert('Failed to fetch weak students');
    } finally {
      setLoadingWeakStudents(false);
    }
  };

  const clearWeakStudentFilters = () => {
    setSelectedClass('');
    setSelectedSubject('');
    setDateType('specific');
    setSpecificDate('');
    setDateFrom('');
    setDateTo('');
    setTopCount('5');
    setWeakStudentsData([]);
  };

  const fetchNotebookStats = async () => {
    if (!nbClass || !nbSubject) return;
    setLoadingNotebook(true);
    try {
      const res = await api.get(`/notebook/grid?classId=${nbClass}&subject=${nbSubject}`);
      setNotebookStats(res.data.stats || null);
    } catch (err) {
      console.error('Failed to fetch notebook stats', err);
    } finally {
      setLoadingNotebook(false);
    }
  };

  useEffect(() => {
    if (nbClass && nbSubject) {
      fetchNotebookStats();
    }
  }, [nbClass, nbSubject]);

  return (
    <PageStack>
      <PageHeader
        title="Teacher Dashboard"
        description="Your assignments, students, and recent activity at a glance."
      />

      {user?.mustChangePassword && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              Your account is using a temporary password.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/teacher/settings')}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
          >
            <Lock className="mr-2 h-4 w-4" />
            Update Password
          </Button>
        </div>
      )}

      {/* Responsive Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Assigned Classes" value={s.assignedClasses || 0} />
        <StatsCard title="Assigned Subjects" value={s.assignedSubjects || 0} />
        <StatsCard title="Total Students" value={s.students || 0} />
        <StatsCard title="Tests Conducted" value={s.testsConducted || 0} />
      </div>

      <ErpSection title="Notebook Checking Progress" icon={FileCheck} tone="fuchsia">
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <FormField label="Class">
            <Select value={nbClass} onValueChange={(v) => { setNbClass(v); setNbSubject(''); setNotebookStats(null); }}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Class" /></SelectTrigger>
              <SelectContent>
                {[...new Map(assignments.map(a => [a.classId, a])).values()].map((a) => (
                  <SelectItem key={a.classId} value={a.classId}>{formatClassName(a.className)} {a.section}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Subject">
            <Select value={nbSubject} onValueChange={setNbSubject}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Subject" /></SelectTrigger>
              <SelectContent>
                {[...new Set(assignments.filter(a => nbClass ? a.classId === nbClass : true).map(a => a.subject))].map((subj) => (
                  <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {!nbClass || !nbSubject ? (
          <div className="py-6 text-center text-slate-500 text-sm">Select a class and subject to view notebook checking progress.</div>
        ) : loadingNotebook ? (
          <div className="py-6 text-center text-slate-500 text-sm">Loading notebook stats...</div>
        ) : notebookStats ? (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <div className="text-sm font-semibold text-slate-500">Checked Entries</div>
              <div className="mt-2 text-2xl font-bold text-emerald-600">{notebookStats.checked}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <div className="text-sm font-semibold text-slate-500">Pending Entries</div>
              <div className="mt-2 text-2xl font-bold text-amber-500">{notebookStats.pending}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <div className="text-sm font-semibold text-slate-500">Not Submitted</div>
              <div className="mt-2 text-2xl font-bold text-rose-500">{notebookStats.notSubmitted}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-fuchsia-50 to-purple-50 p-4 text-center">
              <div className="text-sm font-semibold text-slate-500">Overall Progress</div>
              <div className="mt-2 text-2xl font-bold text-fuchsia-700">{notebookStats.progressPercentage}%</div>
            </div>
          </div>
        ) : null}
      </ErpSection>

      <ErpSection title="Assigned Subjects" icon={BookOpen} tone="blue">
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">No subjects assigned yet.</p>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((a, i) => (
              <div
                key={`${a.classId}-${a.subject}-${i}`}
                className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4"
              >
                <div className="text-lg font-bold text-slate-900">{formatClassName(a.className)} {a.section}</div>
                <div className="text-sm font-semibold text-indigo-600">{a.subject}</div>
              </div>
            ))}
          </div>
        )}
      </ErpSection>

      <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        <ErpSection title="Recent Activities" icon={Activity} tone="green">
          {(data.recentActivities || []).length === 0 ? (
            <p className="text-sm text-slate-500">No recent activities.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentActivities.map((a) => (
                <div className="flex flex-col gap-1 py-2" key={a._id}>
                  <p className="text-sm font-semibold text-slate-900">{a.action}</p>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span>{a.actor?.name}</span>
                    <span>•</span>
                    <span>{formatDisplayDate(a.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ErpSection>

        <ErpSection title="Low Academic Performance Analysis" icon={AlertTriangle} tone="yellow">
          <div className="space-y-4">
            <div className="grid gap-4 bg-slate-50 p-4 rounded-xl">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <FormField label="Class">
                  <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSubject(''); }}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Class" /></SelectTrigger>
                    <SelectContent>
                      {[...new Map(assignments.map(a => [a.classId, a])).values()].map((a) => (
                        <SelectItem key={a.classId} value={a.classId}>{formatClassName(a.className)} {a.section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Subject">
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                    <SelectContent>
                      {[...new Set(assignments.filter(a => selectedClass ? a.classId === selectedClass : true).map(a => a.subject))].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <FormField label="Date Type">
                  <Select value={dateType} onValueChange={setDateType}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="specific">Specific Date</SelectItem>
                      <SelectItem value="range">Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Top Count">
                  <Select value={topCount} onValueChange={setTopCount}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['5', '10', '15', '20'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              {dateType === 'specific' ? (
                <FormField label="Date"><Input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} className="rounded-xl" /></FormField>
              ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <FormField label="From"><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl" /></FormField>
                  <FormField label="To"><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl" /></FormField>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => {
                  if (!checkAndBlock(() => fetchWeakStudents())) return;
                }} disabled={loadingWeakStudents} className="rounded-xl bg-yellow-600 hover:bg-yellow-700 w-full">
                  {loadingWeakStudents ? 'Loading...' : 'Generate Report'}
                </Button>
                <Button onClick={clearWeakStudentFilters} variant="outline" className="rounded-xl w-full">Clear</Button>
              </div>
            </div>

            {weakStudentsData.length > 0 && (
              <div className="space-y-2">
                {weakStudentsData.map((w, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-sm font-bold text-slate-500">#{w.rank}</span>
                    <span className="text-sm font-medium text-slate-900 truncate px-2">{w.studentName}</span>
                    <span className="font-semibold text-slate-700">{w.status === 'absent' ? <AbsentBadge /> : `${w.percentage}%`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ErpSection>
      </div>

      <SubscriptionExpiredDialog
        open={expiredDialogOpen}
        onOpenChange={setExpiredDialogOpen}
      />
    </PageStack>
  );
}