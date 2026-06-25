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
    Promise.all([api.get('/users?role=teacher'), api.get('/classes')]).then(([t, c]) => {
      const activeTeachers = (t.data.users || []).filter((x) => x.status !== 'Inactive');
      setTeachers(activeTeachers);
      setClasses(c.data.classes || []);
    });
  }, []);

  useEffect(() => {
    const params = {};
    if (classId) params.classId = classId;
    api
      .get('/subjects', { params })
      .then((r) => setSubjects(r.data.subjects || []))
      .catch(() => setSubjects([]));
  }, [classId]);

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

      <ErpSection title="Filters" icon={Filter} tone="blue">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

          <FormField label="Class">
            <Select
              value={classId ? classId : ALL_CLASSES_VALUE}
              onValueChange={(v) => setClassId(v === ALL_CLASSES_VALUE ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CLASSES_VALUE}>All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {formatClassName(c.className)}-{c.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Subject">
            <SubjectSelect
              value={subject}
              onChange={setSubject}
              subjects={subjects}
              placeholder="All Subjects"
              includeAllOption
              allLabel="All Subjects"
            />
          </FormField>

          <FormField label="Assessment Type (Multi-select)">
            <AssessmentTypeMultiSelect value={assessmentTypes} onChange={setAssessmentTypes} options={ASSESSMENT_OPTIONS} />
          </FormField>

          <FormField label="Date">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
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

          {dateFilter === 'specific_date' && (
            <FormField label="Specific Date">
              <DatePicker value={specificDate} onChange={setSpecificDate} />
            </FormField>
          )}

          {dateFilter === 'date_range' && (
            <>
              <FormField label="From">
                <DatePicker value={dateFrom} onChange={setDateFrom} />
              </FormField>
              <FormField label="To">
                <DatePicker value={dateTo} onChange={setDateTo} />
              </FormField>
            </>
          )}

          <FormField label="Sort">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
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

        <div className="mt-4">
          <Button onClick={fetchRows} disabled={loading} className="shadow-sm">
            {loading ? 'Loading...' : 'Apply Filters'}
          </Button>
        </div>
      </ErpSection>

      <ErpSection title="Performance List" icon={BarChart3} tone="green">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead>Teacher</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Performance %</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Tests Conducted</TableHead>
                <TableHead>Last Test Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {error ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-rose-600">
                    {error}
                  </TableCell>
                </TableRow>
              ) : loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-slate-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows?.length > 0 ? (
                rows.map((r, idx) => (
                  <TableRow
                    key={`${r?.teacher?._id || r?.teacherId || 't'}-${r?.class?._id || r?.classId || 'c'}-${r?.subject || 's'}-${idx}`}
                    className="hover:bg-slate-50"
                  >
                    <TableCell className="font-medium">{getTeacherName(r)}</TableCell>
                    <TableCell className="font-semibold text-slate-900">{r?.subject || '-'}</TableCell>
                    <TableCell>{getClassLabel(r) || '-'}</TableCell>
                    <TableCell className="text-right font-bold text-indigo-700">{getPerformance(r)}%</TableCell>
                    <TableCell className="text-right">{getStudentsCount(r)}</TableCell>
                    <TableCell className="text-right">{getTestsCount(r)}</TableCell>
                    <TableCell>{getLastTestDate(r) ? formatDisplayDateShort(getLastTestDate(r)) : '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!r?.teacher?._id && !r?.teacherId}
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
                  <TableCell colSpan={8} className="py-10 text-center text-slate-500">
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
