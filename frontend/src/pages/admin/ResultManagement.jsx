import { useEffect, useMemo, useState } from 'react';

import { Filter, Trophy, FileBarChart, Download, RotateCcw, Users, TrendingUp } from 'lucide-react';

import api from '@/lib/api';

import { downloadFile, buildDownloadQuery } from '@/lib/download';

import { formatDisplayDate, formatDisplayDateShort } from '@/lib/dateFormatter';

import AbsentBadge from '@/components/AbsentBadge';

import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import DatePicker from '@/components/ui/DatePicker';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry';
import SubscriptionExpiredDialog from '@/components/subscription/SubscriptionExpiredDialog';



const MAIN_EXAMS = ['PA1', 'PA2', 'PA3', 'PA4', 'FA1', 'FA2', 'Half Yearly', 'Final'];



export default function ResultManagement() {
  const { isSubscriptionExpired, dialogOpen: expiredDialogOpen, setDialogOpen: setExpiredDialogOpen, checkAndBlock } = useSubscriptionExpiry();

  const [classes, setClasses] = useState([]);

  const [teachers, setTeachers] = useState([]);

  const [teacherClasses, setTeacherClasses] = useState([]);

  const [teacherSubjects, setTeacherSubjects] = useState([]);

  const [view, setView] = useState('daily');

  const [filters, setFilters] = useState({

    classId: '',

    subject: '',

    examType: '',

    examDate: '',

    teacher: '',

    testDate: '',

    dateFrom: '',

    dateTo: '',

    sortBy: 'marks_desc',

  });

  const [rows, setRows] = useState([]);

  const [results, setResults] = useState(null);

  const [dateFilterType, setDateFilterType] = useState('specific');

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);



  useEffect(() => {

    Promise.all([api.get('/classes'), api.get('/users?role=teacher')]).then(([c, t]) => {

      const cls = c.data.classes || [];

      setClasses(cls);

      setTeachers(t.data.users || []);

    }).catch(err => {
      console.error('Failed to load initial data:', err);
      setError('Unable to load data');
    });

  }, []);


  useEffect(() => {
    // Load classes assigned to selected teacher
    if (filters.teacher) {
      console.log('=== ADMIN FILTER DEBUG ===');
      console.log('Loading classes for teacher:', filters.teacher);
      api.get(`/users/${filters.teacher}`).then(res => {
        const user = res.data.user;
        console.log('Teacher User Data:', user);
        const assignments = user?.assignments || [];
        console.log('Teacher Assignments:', assignments);
        
        // Extract class objects directly from assignments
        const assignedClasses = assignments
          .map(a => a.class)
          .filter(c => c && c._id && c.className && c.section);
        
        console.log('Assigned Classes from assignments:', assignedClasses);
        
        // Deduplicate classes by _id
        const uniqueClasses = assignedClasses.filter((c, index, self) =>
          index === self.findIndex((t) => t._id === c._id)
        );
        console.log('Deduplicated Classes:', uniqueClasses);
        
        setTeacherClasses(uniqueClasses);
      }).catch(err => {
        console.error('Failed to load teacher data:', err);
        setTeacherClasses([]);
      });
    } else {
      setTeacherClasses([]);
    }
  }, [filters.teacher]);

  useEffect(() => {
    // Load subjects assigned to selected teacher for selected class
    if (filters.teacher && filters.classId) {
      console.log('=== ADMIN FILTER DEBUG ===');
      console.log('Loading subjects for teacher:', filters.teacher, 'and class:', filters.classId);
      api.get(`/users/${filters.teacher}`).then(res => {
        const assignments = res.data.user?.assignments || [];
        console.log('Teacher Assignments:', assignments);
        const subjects = assignments
          .filter(a => (a.class?._id || a.class) === filters.classId)
          .map(a => a.subject)
          .filter(Boolean);
        const uniqueSubjects = [...new Set(subjects)];
        console.log('Available Subjects:', uniqueSubjects);
        setTeacherSubjects(uniqueSubjects);
      }).catch(err => {
        console.error('Failed to load teacher subjects:', err);
        setTeacherSubjects([]);
      });
    } else {
      setTeacherSubjects([]);
    }
  }, [filters.teacher, filters.classId]);

  useEffect(() => {
    // Clear class when teacher changes
    setFilters((f) => ({ ...f, classId: '', subject: '' }));
  }, [filters.teacher]);

  useEffect(() => {
    // Clear subject when class changes
    setFilters((f) => ({ ...f, subject: '' }));
  }, [filters.classId]);



  const load = async () => {

    try {
      setLoading(true);
      setError(null);
      
      console.log('=== ADMIN RESULTS LOAD DEBUG ===');
      console.log('Current Filters:', filters);
      console.log('View:', view);
      console.log('Date Filter Type:', dateFilterType);
      
      // Build params with only non-empty values
      const params = {
        view,
        teacher: filters.teacher,
      };
      
      // Only add optional parameters if they have values
      if (filters.classId) params.classId = filters.classId;
      if (filters.subject) params.subject = filters.subject;
      if (filters.testDate) params.testDate = filters.testDate;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.sortBy) params.sortBy = filters.sortBy;

      console.log('Request Payload:', {
        teacher: params.teacher,
        classId: params.classId,
        subject: params.subject,
        dateFilterType: dateFilterType,
        fromDate: params.dateFrom,
        toDate: params.dateTo,
        testDate: params.testDate
      });

      if (view === 'daily') params.category = 'daily';

      else if (view === 'main') params.category = 'main';

      const res = await api.get('/results', { params });

      console.log('API Response:', res.data);

      // Check if response has the new format with tests array
      if (res.data.tests) {
        setResults(res.data);
        setRows(res.data.results || []);
      } else {
        // Old format - keep rows for backward compatibility
        setRows(res.data.results || []);
        setResults(null);
      }
    } catch (err) {
      console.error('Failed to load results:', err);
      setError('Unable to load results');
      setRows([]);
      setResults(null);
    } finally {
      setLoading(false);
    }

  };



  const toppers = useMemo(() => {
    // Check if any filters are applied
    const hasFilters = filters.teacher || filters.subject || filters.classId || 
                      (view === 'daily' && (filters.testDate || filters.dateFrom || filters.dateTo)) ||
                      (view === 'main' && (filters.examType || filters.examDate));
    
    if (!hasFilters) return []; // Return empty if no filters applied
    
    // Return top 3 students by rank
    return rows.sort((a, b) => a.rank - b.rank).slice(0, 3);
  }, [rows, filters, view]);



  const download = (format) => {

    const q = buildDownloadQuery(filters, view, format);

    downloadFile(`/results/download?${q}`, `results.${format}`);

  };


  const resetFilters = () => {
    setFilters({
      classId: '',
      subject: '',
      examType: '',
      examDate: '',
      teacher: '',
      testDate: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'marks_desc',
    });
    setRows([]);
  };



  return (

    <PageStack>

      <PageHeader

        title="Result Management"

        description="Filter, view, and export student results across daily tests and main exams."

      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}



      <ErpSection title="Filters" icon={Filter} tone="blue" className="!p-4">

        <div className="space-y-3">

          {/* First Row: View, Teacher, Class, Subject */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <FormField label="View">

              <Select value={view} onValueChange={setView}>

                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>

                <SelectContent>

                  <SelectItem value="daily">Daily Test</SelectItem>

                  <SelectItem value="main">Main Exam</SelectItem>

                  <SelectItem value="overall">Overall</SelectItem>

                </SelectContent>

              </Select>

            </FormField>

            <FormField label="Teacher">

              <Select value={filters.teacher} onValueChange={(v) => {
                console.log('=== ADMIN FILTER DEBUG ===');
                console.log('Selected Teacher:', v);
                setFilters({ ...filters, teacher: v, classId: '', subject: '' });
              }}>

                <SelectTrigger className="h-9"><SelectValue placeholder="Select Teacher" /></SelectTrigger>

                <SelectContent>{teachers?.map((t) => <SelectItem key={t._id} value={t._id}>{t.teacherName || t.name}</SelectItem>)}</SelectContent>

              </Select>

            </FormField>

            <FormField label="Class">

              <Select value={filters.classId} onValueChange={(v) => {
                console.log('Selected Class:', v);
                console.log('Available Classes:', teacherClasses);
                setFilters({ ...filters, classId: v, subject: '' });
              }}>

                <SelectTrigger className="h-9"><SelectValue placeholder="Select Class" /></SelectTrigger>

                <SelectContent>
                  {filters.teacher && teacherClasses && teacherClasses.length > 0 ? (
                    teacherClasses.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.className && c.section ? `Class ${c.className}-${c.section}` : 'Invalid Class Data'}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {filters.teacher ? (teacherClasses?.length === 0 ? 'No valid class assignments found' : 'No classes assigned') : 'Select teacher first'}
                    </SelectItem>
                  )}
                </SelectContent>

              </Select>

            </FormField>

            <FormField label="Subject">

              <Select value={filters.subject} onValueChange={(v) => {
                console.log('Selected Subject:', v);
                console.log('Available Subjects:', teacherSubjects);
                setFilters({ ...filters, subject: v });
              }}>

                <SelectTrigger className="h-9"><SelectValue placeholder="Select Subject" /></SelectTrigger>

                <SelectContent>
                  {filters.teacher && filters.classId && teacherSubjects && teacherSubjects.length > 0 ? (
                    teacherSubjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled>{filters.teacher && filters.classId ? 'No subjects assigned' : 'Select teacher and class first'}</SelectItem>
                  )}
                </SelectContent>

              </Select>

            </FormField>

          </div>

          {/* Second Row: Date Filter Type, Date/Date Range, Sort By */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            {view === 'daily' && (

              <FormField label="Date Filter Type">

                <Select value={dateFilterType} onValueChange={setDateFilterType}>

                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>

                  <SelectContent>

                    <SelectItem value="specific">Specific Date</SelectItem>

                    <SelectItem value="range">Date Range</SelectItem>

                  </SelectContent>

                </Select>

              </FormField>

            )}

            {view === 'daily' && dateFilterType === 'specific' && (

              <FormField label="Test Date">
                <DatePicker value={filters.testDate} onChange={(date) => setFilters({ ...filters, testDate: date })} className="h-9" />
              </FormField>

            )}

            {view === 'daily' && dateFilterType === 'range' && (

              <>

                <FormField label="From">
                  <DatePicker value={filters.dateFrom} onChange={(date) => setFilters({ ...filters, dateFrom: date })} className="h-9" />
                </FormField>
                <FormField label="To">
                  <DatePicker value={filters.dateTo} onChange={(date) => setFilters({ ...filters, dateTo: date })} className="h-9" />
                </FormField>

              </>

            )}

            {view === 'main' && (

              <FormField label="Exam Type">

                <Select value={filters.examType} onValueChange={(v) => setFilters({ ...filters, examType: v })}>

                  <SelectTrigger className="h-9"><SelectValue placeholder="Exam Type" /></SelectTrigger>

                  <SelectContent>{MAIN_EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>

                </Select>

              </FormField>

            )}

            {view === 'main' && (

              <FormField label="Exam Date">
                <DatePicker value={filters.examDate} onChange={(date) => setFilters({ ...filters, examDate: date })} className="h-9" />
              </FormField>

            )}

            <FormField label="Sort By">

              <Select value={filters.sortBy} onValueChange={(v) => setFilters({ ...filters, sortBy: v })}>

                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>

                <SelectContent>

                  <SelectItem value="marks_desc">High → Low</SelectItem>

                  <SelectItem value="marks_asc">Low → High</SelectItem>

                  <SelectItem value="rollNo">Roll No</SelectItem>

                  <SelectItem value="name">Student Name</SelectItem>

                </SelectContent>

              </Select>

            </FormField>

          </div>

          {/* Third Row: Apply, Reset, Export CSV, Export PDF */}
          <div className="flex items-center justify-end gap-2 pt-2">

            <Button onClick={() => {
              if (!checkAndBlock(() => load())) return;
            }} className="h-9 px-4" disabled={loading}>
              {loading ? 'Loading...' : 'Apply'}
            </Button>

            <Button onClick={resetFilters} variant="outline" className="h-9 px-4" disabled={loading}>

              <RotateCcw className="mr-2 h-4 w-4" />

              Reset

            </Button>

            {dateFilterType === 'specific' ? (
              <>
                <Button onClick={() => {
                  if (!checkAndBlock(() => download('pdf'))) return;
                }} variant="outline" className="h-9 px-3 text-sm" disabled={loading || rows.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button onClick={() => {
                  if (!checkAndBlock(() => download('xlsx'))) return;
                }} variant="outline" className="h-9 px-3 text-sm" disabled={loading || rows.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => {
                  if (!checkAndBlock(() => download('csv'))) return;
                }} variant="outline" className="h-9 px-3 text-sm" disabled={loading || rows.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button onClick={() => {
                  if (!checkAndBlock(() => download('xlsx'))) return;
                }} variant="outline" className="h-9 px-3 text-sm" disabled={loading || rows.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              </>
            )}

          </div>

        </div>

      </ErpSection>



      <ErpSection title="Topper Students" icon={Trophy} tone="yellow" className="!p-3">

        {toppers.length ? (

          <div className="grid gap-2 sm:grid-cols-3">

            {toppers.map((t, i) => (

              <div key={i} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-2 shadow-sm hover:shadow-md transition-shadow">

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white font-bold text-sm shadow-md">

                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}

                </div>

                <div className="flex-1 min-w-0">

                  <p className="truncate font-semibold text-slate-900 text-xs">{t.student?.name}</p>

                  <p className="text-sm font-bold text-amber-600">{t.percentage}%</p>

                </div>

              </div>

            ))}

          </div>

        ) : (

          <div className="flex flex-col items-center gap-2 py-4 text-slate-500">

            <Trophy className="h-5 w-5 text-amber-400" />

            <p className="text-xs font-medium">Apply filters to view topper students</p>

          </div>

        )}

      </ErpSection>



      <ErpSection title="Results" icon={FileBarChart} tone="green" className="!p-4">

        {results && results.tests && view === 'daily' ? (
          <>
            <div className="mb-4 rounded-lg bg-slate-50 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-700">Class:</span>{' '}
                  <span className="text-slate-600">Class {results.className} {results.section}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Subject:</span>{' '}
                  <span className="text-slate-600">{filters.subject || 'All'}</span>
                </div>
                {dateFilterType === 'specific' && (
                  <div>
                    <span className="font-medium text-slate-700">Test Date:</span>{' '}
                    <span className="text-slate-600">{formatDisplayDate(filters.testDate)}</span>
                  </div>
                )}
                {dateFilterType === 'range' && (
                  <div>
                    <span className="font-medium text-slate-700">Date Range:</span>{' '}
                    <span className="text-slate-600">
                      {formatDisplayDate(filters.dateFrom)} → {formatDisplayDate(filters.dateTo)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No results found</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200" style={{ minWidth: '100%' }}>
                <Table style={{ minWidth: 'max-content' }}>
                  <TableHeader>
                    <>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '60px' }}>Total</TableHead>
                        <TableHead className="sticky left-[60px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '70px' }}>Average</TableHead>
                        <TableHead className="sticky left-[130px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>%</TableHead>
                        <TableHead className="sticky left-[180px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>Rank</TableHead>
                        <TableHead className="sticky left-[230px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '70px' }}>Roll No</TableHead>
                        <TableHead className="sticky left-[300px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '150px' }}>Student Name</TableHead>
                        {results.tests?.map((test, idx) => (
                          <TableHead key={test._id} colSpan={2} className="text-center bg-indigo-100 border-r border-indigo-200" style={{ minWidth: '120px' }}>
                            <div className="rounded-lg bg-indigo-600 px-3 py-2 text-white shadow-sm">
                              <div className="text-sm font-bold">Daily Test {idx + 1}</div>
                              <div className="text-xs text-indigo-100">{formatDisplayDateShort(test.testDate)}</div>
                              <div className="text-xs text-indigo-200">{test.subject}</div>
                              <div className="text-xs text-indigo-300">Teacher: {test.teacherName}</div>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '60px' }}>Total</TableHead>
                        <TableHead className="sticky left-[60px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '70px' }}>Average</TableHead>
                        <TableHead className="sticky left-[130px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>%</TableHead>
                        <TableHead className="sticky left-[180px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>Rank</TableHead>
                        <TableHead className="sticky left-[230px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '70px' }}>Roll No</TableHead>
                        <TableHead className="sticky left-[300px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '150px' }}>Student Name</TableHead>
                        {results.tests?.map((test) => (
                          <>
                            <TableHead className="text-center bg-indigo-50 border-r border-indigo-200 font-semibold text-indigo-700" style={{ minWidth: '80px' }}>Max Marks</TableHead>
                            <TableHead className="text-center bg-indigo-50 border-r border-indigo-200 font-semibold text-indigo-700" style={{ minWidth: '80px' }}>Marks Obtained</TableHead>
                          </>
                        ))}
                      </TableRow>
                    </>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, index) => (
                      <TableRow key={r._id || index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}>
                        <TableCell className="sticky left-0 bg-blue-50 z-10 font-bold text-blue-700 border-r border-slate-200" style={{ minWidth: '60px' }}>{r.totalObtained}</TableCell>
                        <TableCell className="sticky left-[60px] bg-blue-50 z-10 font-semibold text-blue-600 border-r border-slate-200" style={{ minWidth: '70px' }}>{r.average}</TableCell>
                        <TableCell className="sticky left-[130px] bg-blue-50 z-10 font-semibold text-blue-600 border-r border-slate-200" style={{ minWidth: '50px' }}>{r.percentage}%</TableCell>
                        <TableCell className="sticky left-[180px] bg-blue-50 z-10 font-bold text-blue-700 border-r border-slate-200" style={{ minWidth: '50px' }}>{r.rank}</TableCell>
                        <TableCell className="sticky left-[230px] bg-white z-10 border-r border-slate-200" style={{ minWidth: '70px' }}>{r.student?.rollNo}</TableCell>
                        <TableCell className="sticky left-[300px] bg-white z-10 font-medium border-r border-slate-200" style={{ minWidth: '150px' }}>{r.student?.name}</TableCell>
                        {results.tests?.map((test) => {
                          const mark = r.testMarks?.[test._id];
                          return (
                            <>
                              <TableCell className="text-center border-r border-slate-200 text-slate-600" style={{ minWidth: '80px' }}>{test.maxMarks}</TableCell>
                              <TableCell className="text-center border-r border-slate-200 font-semibold text-indigo-700" style={{ minWidth: '80px' }}>
                                {mark?.status === 'absent' ? <AbsentBadge /> : (mark?.marksObtained ?? '')}
                              </TableCell>
                            </>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Summary Chips */}
            {rows.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Total Students: {rows.length}</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-sm">
                  <FileBarChart className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900">Total Results: {rows.length}</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1.5 text-sm">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-900">Average: {rows.length > 0 ? Math.round(rows.reduce((sum, r) => sum + (r.percentage || 0), 0) / rows.length) : 0}%</span>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <Table>

                <TableHeader>

                  <TableRow className="bg-slate-50 border-b border-slate-200">

                    <TableHead className="font-semibold text-slate-700 px-4 py-3">Rank</TableHead>

                    <TableHead className="font-semibold text-slate-700 px-4 py-3">Student</TableHead>

                    <TableHead className="font-semibold text-slate-700 px-4 py-3">Class</TableHead>

                    <TableHead className="font-semibold text-slate-700 px-4 py-3">Exam</TableHead>

                    <TableHead className="font-semibold text-slate-700 px-4 py-3">Date</TableHead>

                    <TableHead className="font-semibold text-slate-700 px-4 py-3">Marks</TableHead>

                    <TableHead className="font-semibold text-slate-700 px-4 py-3">%</TableHead>

                  </TableRow>

                </TableHeader>

                <TableBody>

                  {rows.length === 0 ? (

                    <TableRow>

                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <FileBarChart className="h-12 w-12" />
                          <p className="font-medium">No results found</p>
                          <p className="text-sm">Apply filters to view results</p>
                        </div>
                      </TableCell>

                    </TableRow>

                  ) : (

                    rows?.map((r, idx) => (

                      <TableRow key={idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100">

                        <TableCell className="px-4 py-3 font-medium">{r.rank ?? '-'}</TableCell>

                        <TableCell className="px-4 py-3 font-medium">{r.student?.name || '-'}</TableCell>

                        <TableCell className="px-4 py-3">Class {r.class?.className} {r.class?.section}</TableCell>

                        <TableCell className="px-4 py-3">{r.examType || 'Daily Test'}</TableCell>

                        <TableCell className="px-4 py-3">

                          {r.examDate

                            ? formatDisplayDate(r.examDate)

                            : r.testDate

                              ? formatDisplayDate(r.testDate)

                              : '-'}

                        </TableCell>

                        <TableCell className="px-4 py-3">{(r.totalObtained ?? r.marksObtained)}/{(r.totalMax ?? r.maxMarks)}</TableCell>

                        <TableCell className="px-4 py-3">{r.percentage}%</TableCell>

                      </TableRow>

                    ))

                  )}

                </TableBody>

              </Table>

            </div>
          </>
        )}

      </ErpSection>

      <SubscriptionExpiredDialog
        open={expiredDialogOpen}
        onOpenChange={setExpiredDialogOpen}
      />

    </PageStack>

  );

}

