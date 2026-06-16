import { useEffect, useState } from 'react';
import { BookOpen, Activity, AlertTriangle, Filter, Lock, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { useAuth } from '@/context/AuthContext';
import StatsCard from '@/components/StatsCard';
import AbsentBadge from '@/components/AbsentBadge';
import { PageHeader, ErpSection, PageStack, FormField } from '@/components/erp/PagePrimitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ stats: {}, recentActivities: [], weakStudents: [], assignmentDetails: [] });
  const [weakStudentsData, setWeakStudentsData] = useState([]);
  const [loadingWeakStudents, setLoadingWeakStudents] = useState(false);
  
  // Low Academic Performance Students filters
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
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              Your account is using a temporary password. Please update it from Settings.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/teacher/settings')}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Lock className="mr-2 h-4 w-4" />
            Update Password
          </Button>
        </div>
      )}

      {/* Changed to lg:grid-cols-4 since there are 4 cards remaining */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Assigned Classes" value={s.assignedClasses || 0} />
        <StatsCard title="Assigned Subjects" value={s.assignedSubjects || 0} />
        <StatsCard title="Total Students" value={s.students || 0} />
        <StatsCard title="Tests Conducted" value={s.testsConducted || 0} />
      </div>

      <ErpSection title="Assigned Subjects" icon={BookOpen} tone="blue">
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">
            No subjects assigned yet. Ask your School Admin to assign classes and subjects.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((a, i) => (
              <div
                key={`${a.classId}-${a.subject}-${i}`}
                className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 hover:shadow-md transition-shadow"
              >
                <div className="mb-2">
                  <div className="text-lg font-bold text-slate-900">
                    {formatClassName(a.className)} {a.section}
                  </div>
                  <div className="text-sm font-semibold text-indigo-600">{a.subject}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ErpSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <ErpSection title="Recent Activities" icon={Activity} tone="green">
          {(data.recentActivities || []).length === 0 ? (
            <p className="text-sm text-slate-500">No recent activities.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentActivities.map((a) => (
                <div className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0" key={a._id}>
                  <p className="text-sm font-semibold text-slate-900">{a.action}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>by {a.actor?.name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{formatDisplayDate(a.createdAt)}</span>
                    <span>•</span>
                    <span>{new Date(a.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ErpSection>

        <ErpSection title="Low Academic Performance Students Analysis" icon={AlertTriangle} tone="yellow">
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Class">
                  <Select value={selectedClass} onValueChange={(value) => { setSelectedClass(value); setSelectedSubject(''); }}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...new Map(assignments.map(a => [a.classId, a])).values()].map((a) => (
                        <SelectItem key={a.classId} value={a.classId}>
                          {formatClassName(a.className)} {a.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Subject">
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedClass 
                        ? [...new Set(assignments.filter(a => a.classId === selectedClass).map(a => a.subject))].map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))
                        : [...new Set(assignments.map(a => a.subject))].map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Date Type">
                  <Select value={dateType} onValueChange={setDateType}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="specific">Specific Date</SelectItem>
                      <SelectItem value="range">Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Top Students Count">
                  <Select value={topCount} onValueChange={setTopCount}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              {dateType === 'specific' ? (
                <FormField label="Date">
                  <Input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="rounded-xl"
                  />
                </FormField>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="From">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="rounded-xl"
                    />
                  </FormField>
                  <FormField label="To">
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="rounded-xl"
                    />
                  </FormField>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={fetchWeakStudents}
                  disabled={loadingWeakStudents}
                  className="rounded-xl bg-yellow-600 hover:bg-yellow-700"
                >
                  {loadingWeakStudents ? 'Loading...' : 'Generate Low Academic Performance Students'}
                </Button>
                <Button
                  onClick={clearWeakStudentFilters}
                  variant="outline"
                  className="rounded-xl"
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Results */}
            {weakStudentsData.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Select filters and click "Generate Low Academic Performance Students" to view results.
              </p>
            ) : (
              <div className="space-y-2">
                {weakStudentsData.map((w, i) => (
                  <div
                    key={w.studentId || i}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-500">Rank {w.rank}</span>
                      <span className="text-sm font-medium text-slate-900">{w.studentName}</span>
                    </div>
                    <div className="font-semibold text-slate-700">
                      {w.status === 'absent' ? <AbsentBadge /> : `${w.percentage}%`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ErpSection>
      </div>
    </PageStack>
  );
}