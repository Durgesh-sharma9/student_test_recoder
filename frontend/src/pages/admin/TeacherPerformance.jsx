import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Filter } from 'lucide-react';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { formatDisplayDateShort } from '@/lib/dateFormatter';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SearchableTeacherSelect from '@/components/SearchableTeacherSelect';
import SubjectSelect from '@/components/SubjectSelect';
import DatePicker from '@/components/ui/DatePicker';
import AssessmentTypeMultiSelect from '@/components/AssessmentTypeMultiSelect';

const ASSESSMENT_OPTIONS = [
  'All Assessments',
  'Daily Test',
  'PA1',
  'PA2',
  'Half Yearly',
  'FA2',
  'Final Exam',
];

const SORT_OPTIONS = [
  { value: 'performance_desc', label: 'Performance High → Low' },
  { value: 'performance_asc', label: 'Performance Low → High' },
  { value: 'teacher_az', label: 'Teacher A → Z' },
  { value: 'teacher_za', label: 'Teacher Z → A' },
  { value: 'most_students', label: 'Most Students' },
  { value: 'most_tests', label: 'Most Tests Conducted' },
  { value: 'recently_active', label: 'Recently Active' },
];

const DATE_OPTIONS = [
  { value: 'overall', label: 'Overall' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'specific_date', label: 'Specific Date' },
  { value: 'date_range', label: 'Date Range' },
];

export default function TeacherPerformance() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);

  const [teacherId, setTeacherId] = useState('');
  const [classId, setClassId] = useState('');
  const [subject, setSubject] = useState('');
  const [assessmentTypes, setAssessmentTypes] = useState(['All Assessments']);
  const [dateFilter, setDateFilter] = useState('overall');
  const [specificDate, setSpecificDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('performance_desc');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ALL_CLASSES_VALUE = '__ALL_CLASSES__';

  const getTeacherName = (r) =>
    r?.teacher?.name || r?.teacherName || r?.teacher?.teacherName || 'Unknown';

  const getClassLabel = (r) => {
    if (r?.classLabel) return r.classLabel;
    const cls = r?.class;
    if (cls?.className) return `${formatClassName(cls.className)}-${cls.section}`;
    if (cls?.name && cls?.section) return `${formatClassName(cls.name)}-${cls.section}`;
    if (typeof cls === 'string') return cls;
    return '';
  };

  const getPerformance = (r) =>
    r?.performancePercentage ??
    r?.performance ??
    r?.performancePct ??
    r?.performance_percent ??
    0;

  const getStudentsCount = (r) => r?.studentsCount ?? r?.students ?? r?.studentCount ?? 0;
  const getTestsCount = (r) => r?.testsConducted ?? r?.tests ?? r?.testCount ?? 0;
  const getLastTestDate = (r) => r?.lastTestDate ?? r?.lastDate ?? r?.lastTest ?? null;

  useEffect(() => {
    Promise.all([api.get('/users?role=teacher'), api.get('/classes'), api.get('/subjects')]).then(([t, c, s]) => {
      const activeTeachers = (t.data.users || []).filter((x) => x.status !== 'Inactive');
      setTeachers(activeTeachers);
      setClasses(c.data.classes || []);
      setSubjects(s.data.subjects || []);
    });
  }, []);

  // Load teacher assignments when teacher is selected
  useEffect(() => {
    if (teacherId) {
      console.log('[TeacherPerformance] Teacher selected:', teacherId);
      api.get(`/users/${teacherId}`)
        .then((res) => {
          const assignments = res.data.user?.assignments || [];
          console.log('[TeacherPerformance] Teacher assignments loaded:', assignments);
          setTeacherAssignments(assignments);
        })
        .catch((err) => {
          console.error('[TeacherPerformance] Failed to load teacher assignments:', err);
          setTeacherAssignments([]);
        });
    } else {
      // Reset when teacher is set to All Teachers
      console.log('[TeacherPerformance] Teacher reset to All Teachers');
      setTeacherAssignments([]);
      setSubject('');
      setClassId('');
    }
  }, [teacherId]);

  // Reset classId when subject changes if the current class is not valid for the new subject
  useEffect(() => {
    if (subject && teacherId) {
      const subjectAssignments = teacherAssignments.filter(a => 
        (a.subject === subject) || (a.subject === subject.toUpperCase())
      );
      const subjectClassIds = new Set(subjectAssignments.map(a => a.class?._id || a.class));
      
      // If current classId is not in the filtered classes, reset it
      if (classId && !subjectClassIds.has(classId)) {
        setClassId('');
      }
    }
  }, [subject, teacherId, teacherAssignments, classId]);

  // Reset subject when class changes if the current subject is not valid for the new class
  useEffect(() => {
    if (classId && teacherId) {
      const classAssignments = teacherAssignments.filter(a => 
        (a.class?._id === classId) || (a.class === classId)
      );
      const classSubjects = new Set(classAssignments.map(a => a.subject));
      
      // If current subject is not in the filtered subjects, reset it
      if (subject && !classSubjects.has(subject) && !classSubjects.has(subject.toUpperCase())) {
        setSubject('');
      }
    }
  }, [classId, teacherId, teacherAssignments, subject]);

  // Filter subjects based on teacher's assignments and selected class
  const filteredSubjects = useMemo(() => {
    console.log('[TeacherPerformance] Filtering subjects - teacherId:', teacherId, 'classId:', classId, 'teacherAssignments:', teacherAssignments);
    
    if (!teacherId) {
      // Show all subjects when no teacher selected
      console.log('[TeacherPerformance] No teacher selected, showing all subjects:', subjects.length);
      // Normalize subjects to strings to avoid [object Object] rendering
      return subjects.map(s => {
        if (typeof s === 'string') return s;
        if (typeof s === 'object' && s !== null) {
          return s.name || s.subjectName || s.title || s.label || s.subject?.name || '';
        }
        return '';
      }).filter(Boolean);
    }
    
    // If teacher is selected, derive subjects from assignments directly
    if (teacherAssignments.length === 0) {
      console.log('[TeacherPerformance] No assignments found for teacher, returning empty subjects');
      return [];
    }
    
    // If teacher is selected and class is also selected, show only subjects for that class
    if (classId) {
      const classAssignments = teacherAssignments.filter(a => 
        (a.class?._id === classId) || (a.class === classId)
      );
      console.log('[TeacherPerformance] Class assignments for classId', classId, ':', classAssignments);
      const classSubjects = new Set(classAssignments.map(a => a.subject));
      console.log('[TeacherPerformance] Unique subjects for class:', Array.from(classSubjects));
      return Array.from(classSubjects);
    }
    
    // If only teacher selected (no class), show all unique subjects assigned to that teacher
    const assignedSubjects = new Set(teacherAssignments.map(a => a.subject));
    console.log('[TeacherPerformance] Unique subjects for teacher:', Array.from(assignedSubjects));
    return Array.from(assignedSubjects);
  }, [subjects, teacherId, teacherAssignments, classId]);

  // Filter classes based on teacher's assignments and selected subject
  const filteredClasses = useMemo(() => {
    if (!teacherId) {
      // Show all classes when no teacher selected
      return classes;
    }
    // Filter classes based on teacher's assignments
    const assignedClassIds = new Set(teacherAssignments.map(a => a.class?._id || a.class));
    
    // If subject is selected, further filter by subject
    if (subject) {
      const subjectAssignments = teacherAssignments.filter(a => 
        (a.subject === subject) || (a.subject === subject.toUpperCase())
      );
      const subjectClassIds = new Set(subjectAssignments.map(a => a.class?._id || a.class));
      return classes.filter(c => subjectClassIds.has(c._id));
    }
    
    return classes.filter(c => assignedClassIds.has(c._id));
  }, [classes, teacherId, teacherAssignments, subject]);

  useEffect(() => {
    if (dateFilter !== 'specific_date') setSpecificDate('');
    if (dateFilter !== 'date_range') {
      setDateFrom('');
      setDateTo('');
    }
  }, [dateFilter]);

  const params = useMemo(() => {
    const p = {
      teacherId: teacherId || undefined,
      classId: classId || undefined,
      subject: subject || undefined,
      assessmentTypes: (assessmentTypes || []).join(','),
      dateFilter,
      specificDate: dateFilter === 'specific_date' ? specificDate : undefined,
      dateFrom: dateFilter === 'date_range' ? dateFrom : undefined,
      dateTo: dateFilter === 'date_range' ? dateTo : undefined,
      sortBy,
    };
    return p;
  }, [teacherId, classId, subject, assessmentTypes, dateFilter, specificDate, dateFrom, dateTo, sortBy]);

  const fetchRows = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/teacher-performance', { params });
      console.log('Teacher Performance API Response', res?.data);
      console.log('Rows', res?.data?.rows);

      const nextRows = res?.data?.rows || res?.data?.data?.rows || [];
      setRows(Array.isArray(nextRows) ? nextRows : []);
    } catch (e) {
      console.error('[TeacherPerformance] Failed to load:', e);
      setRows([]);
      setError(e?.response?.data?.message || e?.message || 'Failed to load teacher performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageStack>
      <PageHeader title="Teacher Performance Analytics" description="Analyze teacher performance by Teacher + Subject + Class." />

      {/* Compact & Colorful Filters Section */}
      <ErpSection title="Filters" icon={Filter} tone="indigo">
        <div className="rounded-lg border border-indigo-100 bg-white shadow-sm overflow-hidden">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 p-3">
            <div className="flex flex-col gap-1">
              <FormField label="Teacher">
                <SearchableTeacherSelect
                  value={teacherId}
                  onChange={setTeacherId}
                  teachers={teachers}
                  placeholder="All Teachers"
                  includeAllOption
                  allLabel="All Teachers"
                />
              </FormField>
            </div>

            <div className="flex flex-col gap-1">
              <FormField label="Class">
                <Select
                  value={classId ? classId : ALL_CLASSES_VALUE}
                  onValueChange={(v) => setClassId(v === ALL_CLASSES_VALUE ? '' : v)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CLASSES_VALUE}>All Classes</SelectItem>
                    {filteredClasses.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {formatClassName(c.className)}-{c.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="flex flex-col gap-1">
              <FormField label="Subject">
                <SubjectSelect
                  value={subject}
                  onChange={setSubject}
                  subjects={filteredSubjects}
                  placeholder="All Subjects"
                  includeAllOption
                  allLabel="All Subjects"
                />
              </FormField>
            </div>

            <div className="flex flex-col gap-1">
              <FormField label="Assessment Type">
                <AssessmentTypeMultiSelect value={assessmentTypes} onChange={setAssessmentTypes} options={ASSESSMENT_OPTIONS} />
              </FormField>
            </div>

            <div className="flex flex-col gap-1">
              <FormField label="Date Filter">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            {dateFilter === 'specific_date' && (
              <div className="flex flex-col gap-1">
                <FormField label="Specific Date">
                  <DatePicker value={specificDate} onChange={setSpecificDate} />
                </FormField>
              </div>
            )}

            {dateFilter === 'date_range' && (
              <>
                <div className="flex flex-col gap-1">
                  <FormField label="From">
                    <DatePicker value={dateFrom} onChange={setDateFrom} />
                  </FormField>
                </div>
                <div className="flex flex-col gap-1">
                  <FormField label="To">
                    <DatePicker value={dateTo} onChange={setDateTo} />
                  </FormField>
                </div>
              </>
            )}

            <div className="flex flex-col gap-1">
              <FormField label="Sort By">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>

          {/* Compact Bottom Actions */}
          <div className="border-t border-indigo-50 bg-gradient-to-r from-indigo-50/40 to-blue-50/40 p-2.5 px-3 flex justify-end">
            <Button size="sm" onClick={fetchRows} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-4 text-xs font-medium shadow-sm">
              {loading ? 'Loading...' : 'Apply Filters'}
            </Button>
          </div>
        </div>
      </ErpSection>

      {/* Compact Table Section */}
      <ErpSection title="Performance List" icon={BarChart3} tone="indigo">
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-indigo-50/30">
                <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600">Teacher</TableHead>
                <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600">Subject</TableHead>
                <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600">Class</TableHead>
                <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600 text-right">Performance %</TableHead>
                <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600 text-right">Students</TableHead>
                <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600 text-right">Tests Conducted</TableHead>
                <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600">Last Test Date</TableHead>
                <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {error ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm font-medium text-rose-600">
                    {error}
                  </TableCell>
                </TableRow>
              ) : loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm font-medium text-slate-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows?.length > 0 ? (
                rows.map((r, idx) => (
                  <TableRow
                    key={`${r?.teacher?._id || r?.teacherId || 't'}-${r?.class?._id || r?.classId || 'c'}-${r?.subject || 's'}-${idx}`}
                    className="hover:bg-indigo-50/20 transition-colors"
                  >
                    <TableCell className="py-2 px-3 text-sm font-medium text-slate-800">{getTeacherName(r)}</TableCell>
                    <TableCell className="py-2 px-3 text-sm font-semibold text-slate-900">{r?.subject || '-'}</TableCell>
                    <TableCell className="py-2 px-3 text-sm text-slate-600">{getClassLabel(r) || '-'}</TableCell>
                    <TableCell className="py-2 px-3 text-sm text-right font-bold text-indigo-600">{getPerformance(r)}%</TableCell>
                    <TableCell className="py-2 px-3 text-sm text-right text-slate-700">{getStudentsCount(r)}</TableCell>
                    <TableCell className="py-2 px-3 text-sm text-right text-slate-700">{getTestsCount(r)}</TableCell>
                    <TableCell className="py-2 px-3 text-sm text-slate-600">{getLastTestDate(r) ? formatDisplayDateShort(getLastTestDate(r)) : '-'}</TableCell>
                    <TableCell className="py-2 px-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!r?.teacher?._id && !r?.teacherId}
                        className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-2.5"
                        onClick={() => {
                          const sp = new URLSearchParams();
                          sp.set('teacherId', r?.teacher?._id || r?.teacherId || '');
                          sp.set('classId', r?.class?._id || r?.classId || '');
                          sp.set('subject', r?.subject || '');
                          sp.set('assessmentTypes', (assessmentTypes || []).join(','));
                          sp.set('dateFilter', dateFilter);
                          if (dateFilter === 'specific_date' && specificDate) sp.set('specificDate', specificDate);
                          if (dateFilter === 'date_range') {
                            if (dateFrom) sp.set('dateFrom', dateFrom);
                            if (dateTo) sp.set('dateTo', dateTo);
                          }
                          navigate(`/admin/teacher-performance/view?${sp.toString()}`);
                        }}
                      >
                        View More
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm font-medium text-slate-500">
                    No performance data found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </ErpSection>
    </PageStack>
  );
}