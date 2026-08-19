import { useEffect, useMemo, useState } from 'react';

import { Filter, Trophy, FileBarChart, Download, RotateCcw, Users, TrendingUp, Eye } from 'lucide-react';

import api from '@/lib/api';
import { cn } from '@/lib/utils';

import { downloadFile, buildDownloadQuery } from '@/lib/download';

import { formatDisplayDate, formatDisplayDateShort } from '@/lib/dateFormatter';

import AbsentBadge from '@/components/AbsentBadge';

import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import DatePicker from '@/components/ui/DatePicker';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry';
import SubscriptionExpiredDialog from '@/components/subscription/SubscriptionExpiredDialog';

const getGrade = (pct) => {
  if (pct == null) return '-';
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 33) return 'D';
  return 'F';
};

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
  const [selectedStudentResult, setSelectedStudentResult] = useState(null);

  useEffect(() => {
    api.get('/classes')
      .then((res) => setClasses(res.data.classes || []))
      .catch((err) => console.error('Failed to load classes:', err));

    api.get('/users?role=teacher')
      .then((res) => setTeachers(res.data.users || []))
      .catch(() => setTeachers([]));
  }, []);

  useEffect(() => {
    // Load classes assigned to selected teacher
    if (filters.teacher) {
      api.get(`/users/${filters.teacher}`)
        .then((res) => {
          const assignments = res.data.user?.assignments || [];
          const assignedClasses = assignments
            .map((a) => a.class)
            .filter((c) => c && c._id && c.className && c.section);
          const uniqueClasses = assignedClasses.filter(
            (c, index, self) => index === self.findIndex((t) => t._id === c._id)
          );
          setTeacherClasses(uniqueClasses);
        })
        .catch(() => setTeacherClasses([]));
    } else {
      setTeacherClasses([]);
    }
  }, [filters.teacher]);

  useEffect(() => {
    // Load subjects assigned to selected teacher for selected class
    if (filters.teacher && filters.classId) {
      api.get(`/users/${filters.teacher}`)
        .then((res) => {
          const assignments = res.data.user?.assignments || [];
          const subjects = assignments
            .filter((a) => (a.class?._id || a.class) === filters.classId)
            .map((a) => a.subject)
            .filter(Boolean);
          setTeacherSubjects([...new Set(subjects)]);
        })
        .catch(() => setTeacherSubjects([]));
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
      
      
      
      
      
      
      // Build params with only non-empty values
      const params = {
        view,
      };
      
      // Only add optional parameters if they have values
      if (filters.teacher) params.teacher = filters.teacher;
      if (filters.classId) params.classId = filters.classId;
      if (filters.subject) params.subject = filters.subject;
      if (filters.testDate) params.testDate = filters.testDate;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.sortBy) params.sortBy = filters.sortBy;

      if (view === 'daily') params.category = 'daily';
      else if (view === 'main') params.category = 'main';

      const res = await api.get('/results', { params });

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
    if (!rows || rows.length === 0) return [];
    return [...rows].sort((a, b) => (a.rank || 999) - (b.rank || 999)).slice(0, 3);
  }, [rows]);



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
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-semibold shadow-xs">
          {error}
        </div>
      )}

      <ErpSection title="Filters" icon={Filter} tone="blue" className="relative z-20">
        <div className="rounded-2xl border border-blue-200/80 p-3.5 sm:p-4 bg-gradient-to-br from-[#F5F8FF] via-[#EEF2FF]/60 to-[#F5F8FF] space-y-3 shadow-xs">
          {/* First Row: View, Teacher, Class, Subject */}
          <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="View">
              <Select value={view} onValueChange={setView}>
                <SelectTrigger className="h-8.5 text-xs rounded-xl bg-white border-blue-200/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily" className="text-xs">Daily Test</SelectItem>
                  <SelectItem value="main" className="text-xs">Main Exam</SelectItem>
                  <SelectItem value="overall" className="text-xs">Overall</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Teacher">
              <Select
                value={filters.teacher || 'all'}
                onValueChange={(v) => {
                  setFilters({ ...filters, teacher: v === 'all' ? '' : v, classId: '', subject: '' });
                }}
              >
                <SelectTrigger className="h-8.5 text-xs rounded-xl bg-white border-blue-200/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-xs"><SelectValue placeholder="All Teachers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-semibold">All Teachers</SelectItem>
                  {teachers?.map((t) => <SelectItem key={t._id} value={t._id} className="text-xs">{t.teacherName || t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Class">
              <Select
                value={filters.classId || 'all'}
                onValueChange={(v) => {
                  setFilters({ ...filters, classId: v === 'all' ? '' : v, subject: '' });
                }}
              >
                <SelectTrigger className="h-8.5 text-xs rounded-xl bg-white border-blue-200/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-xs"><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-semibold">All Classes</SelectItem>
                  {((filters.teacher && teacherClasses && teacherClasses.length > 0) ? teacherClasses : classes)?.map((c) => (
                    <SelectItem key={c._id} value={c._id} className="text-xs">
                      Class {c.className} {c.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Subject">
              <Select
                value={filters.subject || 'all'}
                onValueChange={(v) => {
                  setFilters({ ...filters, subject: v === 'all' ? '' : v });
                }}
              >
                <SelectTrigger className="h-8.5 text-xs rounded-xl bg-white border-blue-200/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-xs"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-semibold">All Subjects</SelectItem>
                  {[...new Set([...(teacherSubjects || []), 'MATHEMATICS', 'SCIENCE', 'ENGLISH', 'HINDI', 'SOCIAL SCIENCE', 'COMPUTER', 'SANSKRIT'])].map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* Second Row: Date Filter Type, Date/Date Range, Sort By */}
          <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {view === 'daily' && (
              <FormField label="Date Filter Type">
                <Select value={dateFilterType} onValueChange={setDateFilterType}>
                  <SelectTrigger className="h-8.5 text-xs rounded-xl bg-white border-blue-200/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="specific" className="text-xs">Specific Date</SelectItem>
                    <SelectItem value="range" className="text-xs">Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}

            {view === 'daily' && dateFilterType === 'specific' && (
              <FormField label="Test Date">
                <DatePicker value={filters.testDate} onChange={(date) => setFilters({ ...filters, testDate: date })} className="h-8.5 text-xs rounded-xl bg-white border-blue-200/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-xs" />
              </FormField>
            )}

            {view === 'daily' && dateFilterType === 'range' && (
              <>
                <FormField label="From">
                  <DatePicker value={filters.dateFrom} onChange={(date) => setFilters({ ...filters, dateFrom: date })} className="h-8.5 text-xs rounded-xl bg-white border-blue-200/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-xs" />
                </FormField>
                <FormField label="To">
                  <DatePicker value={filters.dateTo} onChange={(date) => setFilters({ ...filters, dateTo: date })} className="h-8.5 text-xs rounded-xl bg-white border-blue-200/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-xs" />
                </FormField>
              </>
            )}

            {view === 'main' && (
              <FormField label="Exam Type">
                <Select value={filters.examType} onValueChange={(v) => setFilters({ ...filters, examType: v })}>
                  <SelectTrigger className="h-8.5 text-xs rounded-xl bg-white border-blue-200/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-xs"><SelectValue placeholder="Exam Type" /></SelectTrigger>
                  <SelectContent>{MAIN_EXAMS.map((e) => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            )}

            {view === 'main' && (
              <FormField label="Exam Date">
                <DatePicker value={filters.examDate} onChange={(date) => setFilters({ ...filters, examDate: date })} className="h-8.5 text-xs rounded-xl bg-white border-blue-200/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-xs" />
              </FormField>
            )}

            <FormField label="Sort By">
              <Select value={filters.sortBy} onValueChange={(v) => setFilters({ ...filters, sortBy: v })}>
                <SelectTrigger className="h-8.5 text-xs rounded-xl bg-white border-blue-200/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="marks_desc" className="text-xs">High → Low</SelectItem>
                  <SelectItem value="marks_asc" className="text-xs">Low → High</SelectItem>
                  <SelectItem value="rollNo" className="text-xs">Roll No</SelectItem>
                  <SelectItem value="name" className="text-xs">Student Name</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* Third Row: Apply, Reset, Export CSV, Export PDF */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
            <Button
              onClick={() => {
                if (!checkAndBlock(() => load())) return;
              }}
              className="h-8.5 px-6 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'View Result'}
            </Button>

            <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <Button
                onClick={resetFilters}
                variant="outline"
                className="h-8 sm:h-8.5 px-2 sm:px-4 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer w-full sm:w-auto"
                disabled={loading}
              >
                <RotateCcw className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
                Reset
              </Button>

              {dateFilterType === 'specific' ? (
                <>
                  <Button
                    onClick={() => {
                      if (!checkAndBlock(() => download('pdf'))) return;
                    }}
                    variant="outline"
                    className="h-8 sm:h-8.5 px-2 sm:px-3 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer w-full sm:w-auto"
                    disabled={loading || rows.length === 0}
                  >
                    <Download className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
                    PDF
                  </Button>
                  <Button
                    onClick={() => {
                      if (!checkAndBlock(() => download('xlsx'))) return;
                    }}
                    variant="outline"
                    className="h-8 sm:h-8.5 px-2 sm:px-3 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer w-full sm:w-auto"
                    disabled={loading || rows.length === 0}
                  >
                    <Download className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
                    Excel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => {
                      if (!checkAndBlock(() => download('csv'))) return;
                    }}
                    variant="outline"
                    className="h-8 sm:h-8.5 px-2 sm:px-3 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer w-full sm:w-auto"
                    disabled={loading || rows.length === 0}
                  >
                    <Download className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
                    CSV
                  </Button>
                  <Button
                    onClick={() => {
                      if (!checkAndBlock(() => download('xlsx'))) return;
                    }}
                    variant="outline"
                    className="h-8 sm:h-8.5 px-2 sm:px-3 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer w-full sm:w-auto"
                    disabled={loading || rows.length === 0}
                  >
                    <Download className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
                    Excel
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </ErpSection>

      <ErpSection title="Results" icon={FileBarChart} tone="green">
        {results && results.tests && view === 'daily' ? (
          <>
            <div className="mb-3 rounded-xl bg-slate-50 p-3 border border-slate-200/80 shadow-xs">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">Class:</span>{' '}
                  <span className="text-slate-600 font-bold">Class {results.className} {results.section}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Subject:</span>{' '}
                  <span className="text-slate-600 font-bold">{filters.subject || 'All'}</span>
                </div>
                {dateFilterType === 'specific' && (
                  <div>
                    <span className="font-semibold text-slate-700">Test Date:</span>{' '}
                    <span className="text-slate-600 font-bold">{formatDisplayDate(filters.testDate)}</span>
                  </div>
                )}
                {dateFilterType === 'range' && (
                  <div>
                    <span className="font-semibold text-slate-700">Date Range:</span>{' '}
                    <span className="text-slate-600 font-bold">
                      {formatDisplayDate(filters.dateFrom)} → {formatDisplayDate(filters.dateTo)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-medium">No results found</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-xs" style={{ minWidth: '100%' }}>
                <Table style={{ minWidth: 'max-content' }}>
                  <TableHeader>
                    <>
                      <TableRow>
                        <TableHead className="sm:sticky sm:left-0 bg-blue-600 text-white z-10 border-r border-blue-500 py-2 px-3 text-[11px] font-bold uppercase" style={{ minWidth: '60px' }}>Total</TableHead>
                        <TableHead className="sm:sticky sm:left-[60px] bg-blue-600 text-white z-10 border-r border-blue-500 py-2 px-3 text-[11px] font-bold uppercase" style={{ minWidth: '70px' }}>Average</TableHead>
                        <TableHead className="sm:sticky sm:left-[130px] bg-blue-600 text-white z-10 border-r border-blue-500 py-2 px-3 text-[11px] font-bold uppercase" style={{ minWidth: '50px' }}>%</TableHead>
                        <TableHead className="sm:sticky sm:left-[180px] bg-blue-600 text-white z-10 border-r border-blue-500 py-2 px-3 text-[11px] font-bold uppercase" style={{ minWidth: '50px' }}>Rank</TableHead>
                        <TableHead className="sm:sticky sm:left-[230px] bg-blue-600 text-white z-10 border-r border-blue-500 py-2 px-3 text-[11px] font-bold uppercase" style={{ minWidth: '70px' }}>Roll No</TableHead>
                        <TableHead className="sm:sticky sm:left-[300px] bg-blue-600 text-white z-10 border-r border-blue-500 py-2 px-3 text-[11px] font-bold uppercase" style={{ minWidth: '150px' }}>Student Name</TableHead>
                        {results.tests?.map((test, idx) => (
                          <TableHead key={test._id} colSpan={2} className="text-center bg-indigo-100 border-r border-indigo-200 py-2 px-3" style={{ minWidth: '120px' }}>
                            <div className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white shadow-xs">
                              <div className="text-xs font-bold">Daily Test {idx + 1}</div>
                              <div className="text-[10px] text-indigo-100">{formatDisplayDateShort(test.testDate)}</div>
                              <div className="text-[10px] text-indigo-200">{test.subject}</div>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableHead className="sm:sticky sm:left-0 bg-blue-600 text-white z-10 border-r border-blue-500 py-1.5 px-3 text-[10px] uppercase font-bold" style={{ minWidth: '60px' }}>Total</TableHead>
                        <TableHead className="sm:sticky sm:left-[60px] bg-blue-600 text-white z-10 border-r border-blue-500 py-1.5 px-3 text-[10px] uppercase font-bold" style={{ minWidth: '70px' }}>Average</TableHead>
                        <TableHead className="sm:sticky sm:left-[130px] bg-blue-600 text-white z-10 border-r border-blue-500 py-1.5 px-3 text-[10px] uppercase font-bold" style={{ minWidth: '50px' }}>%</TableHead>
                        <TableHead className="sm:sticky sm:left-[180px] bg-blue-600 text-white z-10 border-r border-blue-500 py-1.5 px-3 text-[10px] uppercase font-bold" style={{ minWidth: '50px' }}>Rank</TableHead>
                        <TableHead className="sm:sticky sm:left-[230px] bg-blue-600 text-white z-10 border-r border-blue-500 py-1.5 px-3 text-[10px] uppercase font-bold" style={{ minWidth: '70px' }}>Roll No</TableHead>
                        <TableHead className="sm:sticky sm:left-[300px] bg-blue-600 text-white z-10 border-r border-blue-500 py-1.5 px-3 text-[10px] uppercase font-bold" style={{ minWidth: '150px' }}>Student Name</TableHead>
                        {results.tests?.map((test) => (
                          <>
                            <TableHead key={`max-${test._id}`} className="text-center bg-indigo-50 border-r border-indigo-200 py-1.5 px-3 text-[10px] font-bold text-indigo-700" style={{ minWidth: '80px' }}>Max Marks</TableHead>
                            <TableHead key={`obt-${test._id}`} className="text-center bg-indigo-50 border-r border-indigo-200 py-1.5 px-3 text-[10px] font-bold text-indigo-700" style={{ minWidth: '80px' }}>Marks Obtained</TableHead>
                          </>
                        ))}
                      </TableRow>
                    </>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, index) => (
                      <TableRow key={r._id || index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-100 transition-colors`}>
                        <TableCell className="sm:sticky sm:left-0 bg-blue-50 z-10 font-mono text-xs font-bold text-blue-700 border-r border-slate-200 py-1.5 px-3" style={{ minWidth: '60px' }}>{r.totalObtained}</TableCell>
                        <TableCell className="sm:sticky sm:left-[60px] bg-blue-50 z-10 font-xs font-semibold text-blue-600 border-r border-slate-200 py-1.5 px-3" style={{ minWidth: '70px' }}>{r.average}</TableCell>
                        <TableCell className="sm:sticky sm:left-[130px] bg-blue-50 z-10 font-xs font-semibold text-blue-600 border-r border-slate-200 py-1.5 px-3" style={{ minWidth: '50px' }}>{r.percentage}%</TableCell>
                        <TableCell className="sm:sticky sm:left-[180px] bg-blue-50 z-10 font-xs font-bold text-blue-700 border-r border-slate-200 py-1.5 px-3" style={{ minWidth: '50px' }}>{r.rank}</TableCell>
                        <TableCell className="sm:sticky sm:left-[230px] bg-white z-10 font-mono text-xs text-slate-600 border-r border-slate-200 py-1.5 px-3" style={{ minWidth: '70px' }}>{r.student?.rollNo}</TableCell>
                        <TableCell className="sm:sticky sm:left-[300px] bg-white z-10 text-xs font-bold text-slate-800 border-r border-slate-200 py-1.5 px-3" style={{ minWidth: '150px' }}>{r.student?.name}</TableCell>
                        {results.tests?.map((test) => {
                          const mark = r.testMarks?.[test._id];
                          return (
                            <>
                              <TableCell key={`cell-max-${test._id}`} className="text-center border-r border-slate-200 text-xs text-slate-600 py-1.5 px-3" style={{ minWidth: '80px' }}>{test.maxMarks}</TableCell>
                              <TableCell key={`cell-obt-${test._id}`} className="text-center border-r border-slate-200 text-xs font-bold text-indigo-700 py-1.5 px-3" style={{ minWidth: '80px' }}>
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
              <div className="mb-3 flex flex-wrap gap-2.5">
                <div className="flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/80 px-3 py-1 text-xs font-semibold text-blue-900 shadow-xs">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  <span>Total Students: <strong className="font-extrabold">{rows.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-xs font-semibold text-emerald-900 shadow-xs">
                  <FileBarChart className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Total Results: <strong className="font-extrabold">{rows.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200/80 px-3 py-1 text-xs font-semibold text-purple-900 shadow-xs">
                  <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
                  <span>Average: <strong className="font-extrabold">{rows.length > 0 ? Math.round(rows.reduce((sum, r) => sum + (r.percentage || 0), 0) / rows.length) : 0}%</strong></span>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-xs">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="font-bold text-slate-600 py-2 px-3 text-[11px] uppercase">Rank</TableHead>
                    <TableHead className="font-bold text-slate-600 py-2 px-3 text-[11px] uppercase">Student</TableHead>
                    <TableHead className="font-bold text-slate-600 py-2 px-3 text-[11px] uppercase">Class</TableHead>
                    <TableHead className="font-bold text-slate-600 py-2 px-3 text-[11px] uppercase">Exam</TableHead>
                    <TableHead className="font-bold text-slate-600 py-2 px-3 text-[11px] uppercase">Date</TableHead>
                    <TableHead className="font-bold text-slate-600 py-2 px-3 text-[11px] uppercase">Marks</TableHead>
                    <TableHead className="font-bold text-slate-600 py-2 px-3 text-[11px] uppercase">%</TableHead>
                    <TableHead className="font-bold text-slate-600 py-2 px-3 text-[11px] uppercase text-right">View</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mb-1 shadow-xs">
                            <FileBarChart className="h-5.5 w-5.5" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-800">No results found</h4>
                          <p className="text-xs text-slate-500 max-w-sm">Apply filters above and click &quot;View Result&quot; to fetch student performance records.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows?.map((r, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                        <TableCell className="py-2 px-3 font-semibold text-xs text-slate-700">
                          {r.rank ? (
                            <span className={cn(
                              "inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-extrabold shadow-xs",
                              r.rank === 1 ? "bg-gradient-to-tr from-amber-400 to-yellow-500 text-white" :
                              r.rank === 2 ? "bg-gradient-to-tr from-slate-300 to-slate-400 text-slate-900" :
                              r.rank === 3 ? "bg-gradient-to-tr from-amber-600 to-orange-500 text-white" :
                              "bg-indigo-50 text-indigo-700"
                            )}>
                              {r.rank}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-xs font-bold text-slate-800">
                          <div className="font-bold text-slate-900 leading-tight">{r.student?.name || '-'}</div>
                          {(r.student?.parent?.parentName || r.student?.fatherName) && (
                            <div className="text-[10.5px] text-slate-500 font-normal leading-tight mt-0.5">
                              Father: {r.student?.parent?.parentName || r.student?.fatherName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-xs text-slate-600 font-medium">Class {r.class?.className} {r.class?.section}</TableCell>
                        <TableCell className="py-2 px-3 text-xs text-slate-600 font-medium">{r.examType || 'Daily Test'}</TableCell>
                        <TableCell className="py-2 px-3 text-xs text-slate-600 font-medium">
                          {r.examDate
                            ? formatDisplayDate(r.examDate)
                            : r.testDate
                              ? formatDisplayDate(r.testDate)
                              : '-'}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-xs font-bold text-slate-800">{(r.totalObtained ?? r.marksObtained)}/{(r.totalMax ?? r.maxMarks)}</TableCell>
                        <TableCell className="py-2 px-3">
                          {r.percentage != null ? (
                            <span className="inline-flex items-center font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs border border-emerald-200/70">
                              {r.percentage}%
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedStudentResult(r)}
                            className="h-7 px-2.5 text-xs font-semibold rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200 shadow-xs cursor-pointer inline-flex items-center"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </ErpSection>

      <ErpSection title="Topper Students" icon={Trophy} tone="yellow">
        <div className="rounded-2xl border border-amber-200/80 p-3.5 sm:p-4 bg-gradient-to-br from-[#FFFDF5] via-[#FFF9E6]/60 to-[#FFFDF5] shadow-xs">
          {toppers.length ? (
            <div className="grid gap-2.5 sm:grid-cols-3">
              {toppers.map((t, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-2.5 shadow-xs transition-all hover:shadow-md",
                    i === 0
                      ? "border-amber-300 bg-gradient-to-br from-amber-100/90 via-yellow-50 to-amber-50"
                      : i === 1
                        ? "border-slate-300 bg-gradient-to-br from-slate-100/90 via-slate-50 to-slate-100/50"
                        : "border-orange-300 bg-gradient-to-br from-orange-100/90 via-amber-50 to-orange-50"
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-white font-bold text-base shadow-md">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-bold text-slate-900 text-xs">{t.student?.name}</p>
                    <p className="text-xs font-bold text-amber-700">{t.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-5 px-4 text-center">
              <div className="flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-amber-100/90 text-amber-600 mb-2 shadow-xs">
                <Trophy className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-extrabold text-slate-800 mb-0.5">Ready to view topper students?</h4>
              <p className="text-[11px] text-slate-500 max-w-sm">Select teacher, class, or subject filters above and click &quot;View Result&quot; to show top performers.</p>
            </div>
          )}
        </div>
      </ErpSection>

      {selectedStudentResult && (
        <Dialog open={Boolean(selectedStudentResult)} onOpenChange={(open) => !open && setSelectedStudentResult(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl p-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <FileBarChart className="h-5 w-5 text-indigo-600" />
                Student Performance Card
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 p-4 space-y-3 shadow-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">{selectedStudentResult.student?.name}</h3>
                    {(selectedStudentResult.student?.parent?.parentName || selectedStudentResult.student?.fatherName) && (
                      <p className="text-xs text-slate-600 font-medium mt-0.5">Father: {selectedStudentResult.student?.parent?.parentName || selectedStudentResult.student?.fatherName}</p>
                    )}
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Roll No: <span className="font-mono text-slate-700">{selectedStudentResult.student?.rollNo || '-'}</span></p>
                  </div>
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-200 shadow-xs">
                    {selectedStudentResult.percentage}% ({getGrade(selectedStudentResult.percentage)})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-indigo-100 text-xs">
                  <div><span className="text-slate-500 font-medium">Class:</span> <strong className="text-slate-800 font-bold block">Class {selectedStudentResult.class?.className} {selectedStudentResult.class?.section}</strong></div>
                  <div><span className="text-slate-500 font-medium">Exam:</span> <strong className="text-slate-800 font-bold block">{selectedStudentResult.examType || 'Daily Test'}</strong></div>
                  <div><span className="text-slate-500 font-medium">Marks:</span> <strong className="text-slate-800 font-bold block">{(selectedStudentResult.totalObtained ?? selectedStudentResult.marksObtained)} / {(selectedStudentResult.totalMax ?? selectedStudentResult.maxMarks)}</strong></div>
                  <div><span className="text-slate-500 font-medium">Rank:</span> <strong className="text-indigo-600 font-extrabold block">{selectedStudentResult.rank ? `#${selectedStudentResult.rank}` : '-'}</strong></div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <SubscriptionExpiredDialog
        open={expiredDialogOpen}
        onOpenChange={setExpiredDialogOpen}
      />
    </PageStack>
  );
}

