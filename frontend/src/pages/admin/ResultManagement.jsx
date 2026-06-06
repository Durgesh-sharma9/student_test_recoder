import { useEffect, useMemo, useState } from 'react';

import { Filter, Trophy, FileBarChart, Download, RotateCcw, Users, TrendingUp } from 'lucide-react';

import api from '@/lib/api';

import { downloadFile, buildDownloadQuery } from '@/lib/download';

import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';



const MAIN_EXAMS = ['PA1', 'PA2', 'PA3', 'PA4', 'FA1', 'FA2', 'Half Yearly', 'Final'];



export default function ResultManagement() {

  const [classes, setClasses] = useState([]);

  const [teachers, setTeachers] = useState([]);

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
    // Load subjects assigned to selected teacher
    if (filters.teacher) {
      api.get(`/users/${filters.teacher}`).then(res => {
        const assignments = res.data.user?.assignments || [];
        const subjects = assignments.map(a => a.subject).filter(Boolean);
        setTeacherSubjects(subjects);
      }).catch(err => {
        console.error('Failed to load teacher subjects:', err);
        setTeacherSubjects([]);
      });
    } else {
      setTeacherSubjects([]);
    }
  }, [filters.teacher]);


  useEffect(() => {
    // Clear subject when teacher changes
    setFilters((f) => ({ ...f, subject: '' }));
  }, [filters.teacher]);


  useEffect(() => {
    // Clear class when subject changes
    setFilters((f) => ({ ...f, classId: '' }));
  }, [filters.subject]);



  const load = async () => {

    try {
      setLoading(true);
      setError(null);
      const params = { ...filters, view };

      if (view === 'daily') params.category = 'daily';

      else if (view === 'main') params.category = 'main';

      const res = await api.get('/results', { params });

      setRows(res.data.results || []);
    } catch (err) {
      console.error('Failed to load results:', err);
      setError('Unable to load results');
      setRows([]);
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
    return rows.filter((r) => r.rank === 1).slice(0, 3);
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

          {/* First Row: View, Teacher, Subject, Class */}
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

              <Select value={filters.teacher} onValueChange={(v) => setFilters({ ...filters, teacher: v })}>

                <SelectTrigger className="h-9"><SelectValue placeholder="Select Teacher" /></SelectTrigger>

                <SelectContent>{teachers?.map((t) => <SelectItem key={t._id} value={t._id}>{t.teacherName || t.name}</SelectItem>)}</SelectContent>

              </Select>

            </FormField>

            <FormField label="Subject">

              <Select value={filters.subject} onValueChange={(v) => setFilters({ ...filters, subject: v })}>

                <SelectTrigger className="h-9"><SelectValue placeholder="Select Subject" /></SelectTrigger>

                <SelectContent>
                  {filters.teacher && teacherSubjects && teacherSubjects.length > 0 ? (
                    teacherSubjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled>{filters.teacher ? 'No subjects assigned' : 'Select teacher first'}</SelectItem>
                  )}
                </SelectContent>

              </Select>

            </FormField>

            <FormField label="Class">

              <Select value={filters.classId} onValueChange={(v) => setFilters({ ...filters, classId: v })}>

                <SelectTrigger className="h-9"><SelectValue placeholder="Select Class" /></SelectTrigger>

                <SelectContent>{classes?.map((c) => <SelectItem key={c._id} value={c._id}>Class {c.className} {c.section}</SelectItem>)}</SelectContent>

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

                <Input type="date" value={filters.testDate} onChange={(e) => setFilters({ ...filters, testDate: e.target.value })} className="h-9" />

              </FormField>

            )}

            {view === 'daily' && dateFilterType === 'range' && (

              <>

                <FormField label="From">

                  <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="h-9" />

                </FormField>

                <FormField label="To">

                  <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="h-9" />

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

                <Input type="date" placeholder="Exam Date" value={filters.examDate} onChange={(e) => setFilters({ ...filters, examDate: e.target.value })} className="h-9" />

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

            <Button onClick={load} className="h-9 px-4" disabled={loading}>
              {loading ? 'Loading...' : 'Apply'}
            </Button>

            <Button onClick={resetFilters} variant="outline" className="h-9 px-4" disabled={loading}>

              <RotateCcw className="mr-2 h-4 w-4" />

              Reset

            </Button>

            <Button onClick={() => download('csv')} variant="outline" className="h-9 px-3 text-sm" disabled={loading || rows.length === 0}>

              <Download className="mr-2 h-4 w-4" />

              CSV

            </Button>

            <Button onClick={() => download('pdf')} variant="outline" className="h-9 px-3 text-sm" disabled={loading || rows.length === 0}>

              <Download className="mr-2 h-4 w-4" />

              PDF

            </Button>

          </div>

        </div>

      </ErpSection>



      <ErpSection title="Topper Students" icon={Trophy} tone="yellow" className="!p-4">

        {toppers.length ? (

          <div className="grid gap-3 sm:grid-cols-3">

            {toppers.map((t, i) => (

              <div key={i} className="flex items-center gap-3 rounded-lg border bg-gradient-to-br from-amber-50 to-yellow-50 p-3 shadow-sm">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-400 text-white font-bold text-lg shadow-md">

                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}

                </div>

                <div className="flex-1 min-w-0">

                  <p className="truncate font-semibold text-slate-900">{t.student?.name}</p>

                  <p className="text-sm font-bold text-amber-600">{t.percentage}%</p>

                </div>

              </div>

            ))}

          </div>

        ) : (

          <div className="flex items-center gap-3 text-slate-500">

            <Trophy className="h-5 w-5" />

            <p className="text-sm">Apply filters to view topper students</p>

          </div>

        )}

      </ErpSection>



      <ErpSection title="Results" icon={FileBarChart} tone="green" className="!p-4">

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

                        ? new Date(r.examDate).toLocaleDateString('en-GB')

                        : r.testDate

                          ? new Date(r.testDate).toLocaleDateString('en-GB')

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

      </ErpSection>

    </PageStack>

  );

}

