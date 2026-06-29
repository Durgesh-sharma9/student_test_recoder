import { useEffect, useState } from 'react';
import { Filter, FileBarChart, Download } from 'lucide-react';
import api from '@/lib/api';
import { downloadFile, buildDownloadQuery } from '@/lib/download';
import { useSubjects } from '@/hooks/useSubjects';
import SubjectSelect from '@/components/SubjectSelect';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDisplayDate, formatDisplayDateShort } from '@/lib/dateFormatter';
import AbsentBadge from '@/components/AbsentBadge';
import DatePicker from '@/components/ui/DatePicker';

const MAIN_EXAMS = ['PA1', 'PA2', 'PA3', 'PA4', 'FA1', 'FA2', 'Half Yearly', 'Final'];

export default function TeacherResults() {
  const [classes, setClasses] = useState([]);
  const [examType, setExamType] = useState('daily');
  const [filters, setFilters] = useState({
    classId: '', subject: '', examType: '', examDate: '',
    testDate: new Date().toISOString().split('T')[0],
    dateFrom: '', dateTo: '', sortBy: 'rollNo',
  });
  const [dateFilterType, setDateFilterType] = useState('specific');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { subjects, loading: subjectsLoading, allowCustom, canAddSubjects, registerSubject, emptyMessage } =
    useSubjects(filters.classId);

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data.classes || []));
  }, []);

  useEffect(() => { setFilters((f) => ({ ...f, subject: '' })); }, [filters.classId]);

  const load = async () => {
    if (!filters.classId) return;
    setLoading(true);
    try {
      const params = { ...filters, view: examType, category: examType === 'daily' ? 'daily' : examType === 'overall' ? undefined : 'main' };
      if (examType === 'overall') delete params.category;
      if (examType === 'daily') {
        if (dateFilterType === 'specific') { delete params.dateFrom; delete params.dateTo; }
        else { delete params.testDate; }
      }
      const res = await api.get('/results', { params });
      setResults(res.data);
    } catch (error) { console.error('Failed to fetch results:', error); }
    finally { setLoading(false); }
  };

  const download = (format) => {
    const q = buildDownloadQuery(filters, examType, format);
    downloadFile(`/results/download?${q}`, `results.${format}`);
  };

  const filteredResults = results?.results ? results.results.filter(
    (r) => r.student?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           r.student?.rollNo?.toString().toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const isDailyTest = examType === 'daily';

  return (
    <PageStack className="bg-slate-50">
      <PageHeader title="Results" description="View and export results for your assigned classes and subjects." />

      <ErpSection title="Filters" icon={Filter} tone="blue">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          {/* ... (Filters remains same as original) */}
          <FormField label="Exam Type"><Select value={examType} onValueChange={setExamType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily Test</SelectItem><SelectItem value="main">Main Exam</SelectItem></SelectContent></Select></FormField>
          <FormField label="Class"><Select value={filters.classId || undefined} onValueChange={(v) => setFilters({ ...filters, classId: v, subject: '' })}><SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c._id} value={c._id}>Class {c.className} {c.section}</SelectItem>)}</SelectContent></Select></FormField>
          <FormField label="Subject"><SubjectSelect value={filters.subject} onChange={(subject) => setFilters({ ...filters, subject })} subjects={subjects} loading={subjectsLoading} allowCustom={allowCustom} canAddSubjects={canAddSubjects} onRegisterSubject={registerSubject} emptyMessage={emptyMessage} /></FormField>
          {examType === 'daily' && (
            <>
              <FormField label="Date Filter Type"><Select value={dateFilterType} onValueChange={setDateFilterType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="specific">Specific Date</SelectItem><SelectItem value="range">Date Range</SelectItem></SelectContent></Select></FormField>
              {dateFilterType === 'specific' ? <FormField label="Test Date"><DatePicker value={filters.testDate} onChange={(date) => setFilters({ ...filters, testDate: date })} /></FormField> : <><FormField label="From"><DatePicker value={filters.dateFrom} onChange={(date) => setFilters({ ...filters, dateFrom: date })} /></FormField><FormField label="To"><DatePicker value={filters.dateTo} onChange={(date) => setFilters({ ...filters, dateTo: date })} /></FormField></>}
            </>
          )}
          {examType === 'main' && (<><FormField label="Exam Type"><Select value={filters.examType} onValueChange={(v) => setFilters({ ...filters, examType: v })}><SelectTrigger><SelectValue placeholder="Exam Type" /></SelectTrigger><SelectContent>{MAIN_EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select></FormField><FormField label="Exam Date"><DatePicker value={filters.examDate} onChange={(date) => setFilters({ ...filters, examDate: date })} /></FormField></>)}
          <div className="md:col-span-2 lg:col-span-3 flex flex-wrap gap-2 pt-2">
            <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Apply'}</Button>
            <Button variant="outline" onClick={() => download('csv')}>CSV</Button>
            <Button variant="outline" onClick={() => download('pdf')}>PDF</Button>
            <Button variant="outline" onClick={() => download('xlsx')}>Excel</Button>
          </div>
        </div>
      </ErpSection>

      {results && (
        <ErpSection title="Results" icon={FileBarChart} tone="green">
          {/* Table Container with Responsive Scroll */}
          <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <div className="min-w-[800px]"> {/* Ensures table doesn't squish on mobile */}
              <Table>
                <TableHeader>
                  {isDailyTest ? (
                    <TableRow>
                      <TableHead className="sticky left-0 z-20 bg-slate-100 border-r">Total</TableHead>
                      <TableHead>Avg</TableHead>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Student Name</TableHead>
                      {results.tests?.map((t, i) => <TableHead key={t._id} className="text-center">Test {i + 1}</TableHead>)}
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableHead>Rank</TableHead><TableHead>Roll</TableHead><TableHead>Name</TableHead><TableHead>Marks</TableHead><TableHead>%</TableHead>
                    </TableRow>
                  )}
                </TableHeader>
                <TableBody>
                  {filteredResults.map((r, i) => (
                    <TableRow key={i}>
                      {isDailyTest ? (
                        <>
                          <TableCell className="sticky left-0 z-20 bg-white border-r font-bold">{r.totalObtained}</TableCell>
                          <TableCell>{r.average}</TableCell>
                          <TableCell>{r.student?.rollNo}</TableCell>
                          <TableCell className="font-medium">{r.student?.name}</TableCell>
                          {results.tests?.map((t) => <TableCell key={t._id}>{r.testMarks?.[t._id]?.marksObtained ?? '-'}</TableCell>)}
                        </>
                      ) : (
                        <>
                          <TableCell>{r.rank || '-'}</TableCell>
                          <TableCell>{r.student?.rollNo}</TableCell>
                          <TableCell>{r.student?.name}</TableCell>
                          <TableCell>{r.marksObtained}/{r.maxMarks}</TableCell>
                          <TableCell>{r.percentage}%</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </ErpSection>
      )}
    </PageStack>
  );
}