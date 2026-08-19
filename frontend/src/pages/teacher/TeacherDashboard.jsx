import { useEffect, useState } from 'react';
import { BookOpen, Activity, AlertTriangle, Lock, AlertCircle } from 'lucide-react';
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
import DatePicker from '@/components/ui/DatePicker';
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

  return (
    <PageStack>
      <PageHeader
        title="Teacher Dashboard"
        description="Your assignments, students, and recent activity at a glance."
      />

      {user?.mustChangePassword && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-amber-900">
              Your account is using a temporary password.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/teacher/settings')}
            className="rounded-md bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto shadow-sm"
          >
            <Lock className="mr-1.5 h-3.5 w-3.5" />
            Update Password
          </Button>
        </div>
      )}

      {/* Responsive Stats Grid - Fixed inline gradients */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <StatsCard className="bg-gradient-to-br from-yellow-50 via-amber-50/40 to-orange-50/60 border-yellow-100/90" title="Assigned Classes" value={s.assignedClasses || 0} />
        <StatsCard className="bg-gradient-to-br from-blue-50 via-indigo-50/40 to-blue-50/60 border-blue-100/90" title="Assigned Subjects" value={s.assignedSubjects || 0} />
        <StatsCard className="bg-gradient-to-br from-emerald-50 via-teal-50/40 to-emerald-50/60 border-emerald-100/90" title="Total Students" value={s.students || 0} />
        <StatsCard className="bg-gradient-to-br from-orange-50 via-amber-50/40 to-red-50/60 border-orange-100/90" title="Tests Conducted" value={s.testsConducted || 0} />
      </div>

      <ErpSection className="bg-gradient-to-br from-blue-50/80 to-indigo-50/30" title="Assigned Subjects" icon={BookOpen} tone="blue">
        {assignments.length === 0 ? (
          <p className="text-xs sm:text-sm text-slate-500 py-2">No subjects assigned yet.</p>
        ) : (
          <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((a, i) => (
              <div
                key={`${a.classId}-${a.subject}-${i}`}
                className="group flex flex-col justify-center rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/70 p-2.5 sm:p-3.5 shadow-xs transition-all hover:border-blue-300 hover:shadow-sm"
              >
                <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">{formatClassName(a.className)} {a.section}</div>
                <div className="text-[11px] sm:text-xs font-semibold text-indigo-600 mt-0.5 leading-tight">{a.subject}</div>
              </div>
            ))}
          </div>
        )}
      </ErpSection>

      <div className="grid gap-3 sm:gap-5 grid-cols-1 lg:grid-cols-2">
        <ErpSection className="bg-gradient-to-br from-emerald-50/80 to-teal-50/30" title="Recent Activities" icon={Activity} tone="green">
          {(data.recentActivities || []).length === 0 ? (
            <p className="text-xs sm:text-sm text-slate-500 py-2">No recent activities.</p>
          ) : (
            <div className="flex flex-col gap-1 -mx-1">
              {data.recentActivities.map((a) => (
                <div className="flex flex-col gap-0.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg hover:bg-emerald-50/80 transition-colors" key={a._id}>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-tight">{a.action}</p>
                  <div className="flex items-center gap-1.5 text-[10.5px] sm:text-xs text-slate-500">
                    <span className="font-medium text-slate-600">{a.actor?.name}</span>
                    <span className="text-slate-300">•</span>
                    <span>{formatDisplayDate(a.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ErpSection>

        <ErpSection className="bg-gradient-to-br from-amber-50/80 to-yellow-50/30" title="Low Academic Performance Analysis" icon={AlertTriangle} tone="yellow">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col gap-2.5 sm:gap-3 bg-gradient-to-br from-amber-50/80 to-yellow-50/50 border border-amber-200/80 p-2.5 sm:p-3.5 rounded-xl shadow-xs">
              <div className="grid gap-2 sm:gap-3 grid-cols-2">
                <FormField label="Class">
                  <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSubject(''); }}>
                    <SelectTrigger className="rounded-lg h-8 sm:h-9 text-xs bg-white"><SelectValue placeholder="Class" /></SelectTrigger>
                    <SelectContent>
                      {[...new Map(assignments.map(a => [a.classId, a])).values()].map((a) => (
                        <SelectItem key={a.classId} value={a.classId} className="text-xs">{formatClassName(a.className)} {a.section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Subject">
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="rounded-md h-8 sm:h-9 text-xs bg-white"><SelectValue placeholder="Subject" /></SelectTrigger>
                    <SelectContent>
                      {[...new Set(assignments.filter(a => selectedClass ? a.classId === selectedClass : true).map(a => a.subject))].map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              
              <div className="grid gap-2 sm:gap-3 grid-cols-2">
                <FormField label="Date Type">
                  <Select value={dateType} onValueChange={setDateType}>
                    <SelectTrigger className="rounded-md h-8 sm:h-9 text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="specific" className="text-xs">Specific Date</SelectItem>
                      <SelectItem value="range" className="text-xs">Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Top Count">
                  <Select value={topCount} onValueChange={setTopCount}>
                    <SelectTrigger className="rounded-md h-8 sm:h-9 text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['5', '10', '15', '20'].map(n => <SelectItem key={n} value={n} className="text-xs">{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              {dateType === 'specific' ? (
                <FormField label="Date"><DatePicker value={specificDate} onChange={setSpecificDate} className="rounded-md h-8 sm:h-9 text-xs bg-white" /></FormField>
              ) : (
                <div className="grid gap-2 sm:gap-3 grid-cols-2">
                  <FormField label="From"><DatePicker value={dateFrom} onChange={setDateFrom} className="rounded-md h-8 sm:h-9 text-xs bg-white" /></FormField>
                  <FormField label="To"><DatePicker value={dateTo} onChange={setDateTo} className="rounded-md h-8 sm:h-9 text-xs bg-white" /></FormField>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
                <Button 
                  size="sm"
                  onClick={() => { if (!checkAndBlock(() => fetchWeakStudents())) return; }} 
                  disabled={loadingWeakStudents} 
                  className="rounded-lg h-8 sm:h-9 text-xs bg-yellow-600 hover:bg-yellow-700 w-full sm:flex-1 shadow-xs cursor-pointer"
                >
                  {loadingWeakStudents ? 'Loading...' : 'Generate Report'}
                </Button>
                <Button 
                  size="sm" 
                  onClick={clearWeakStudentFilters} 
                  variant="outline" 
                  className="rounded-lg h-8 sm:h-9 text-xs w-full sm:w-auto bg-white border-slate-200 cursor-pointer"
                >
                  Clear
                </Button>
              </div>
            </div>

            {weakStudentsData.length > 0 && (
              <div className="rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50 to-white overflow-hidden shadow-xs">
                <div className="divide-y divide-amber-100">
                  {weakStudentsData.map((w, i) => (
                    <div key={i} className="flex items-center justify-between p-2 sm:p-2.5 hover:bg-amber-100/50 transition-colors">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="text-xs font-semibold text-slate-400 w-5">#{w.rank}</span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{w.studentName}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-slate-700 shrink-0">
                        {w.status === 'absent' ? <AbsentBadge /> : `${w.percentage}%`}
                      </span>
                    </div>
                  ))}
                </div>
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