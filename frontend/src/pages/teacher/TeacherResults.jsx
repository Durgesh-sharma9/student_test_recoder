import { useEffect, useState } from 'react';
import { Filter, FileBarChart, Search } from 'lucide-react';
import api from '@/lib/api';
import { downloadFile, buildDownloadQuery } from '@/lib/download';
import { useSubjects } from '@/hooks/useSubjects';
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry';
import SubjectSelect from '@/components/SubjectSelect';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDisplayDate } from '@/lib/dateFormatter';
import DatePicker from '@/components/ui/DatePicker';
import SubscriptionExpiredDialog from '@/components/subscription/SubscriptionExpiredDialog';
import { formatClassName } from '@/lib/utils';

const MAIN_EXAMS = ['PA1', 'PA2', 'PA3', 'PA4', 'FA1', 'FA2', 'Half Yearly', 'Final'];

export default function TeacherResults() {
  const { isSubscriptionExpired, dialogOpen: expiredDialogOpen, setDialogOpen: setExpiredDialogOpen, checkAndBlock } = useSubscriptionExpiry();
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
    <PageStack>
      {/* Thoda Dark Gradients (Level 100 to White) */}
      <style>{`
        .override-blue-grad { background: linear-gradient(to bottom right, #dbeafe, #ffffff) !important; }
        .override-green-grad { background: linear-gradient(to bottom right, #d1fae5, #ffffff) !important; }
      `}</style>

      <PageHeader title="Results" description="View and export student performance data." />

      <ErpSection className="override-blue-grad" title="Filters" icon={Filter} tone="blue">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-4 bg-white/60 rounded-lg border border-slate-200">
          <FormField label="Exam Type"><Select value={examType} onValueChange={setExamType}><SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily Test</SelectItem><SelectItem value="main">Main Exam</SelectItem></SelectContent></Select></FormField>
          <FormField label="Class"><Select value={filters.classId || undefined} onValueChange={(v) => setFilters({ ...filters, classId: v, subject: '' })}><SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c._id} value={c._id}>{formatClassName(c.className)} {c.section}</SelectItem>)}</SelectContent></Select></FormField>
          <FormField label="Subject"><div className="h-9"><SubjectSelect value={filters.subject} onChange={(subject) => setFilters({ ...filters, subject })} subjects={subjects} loading={subjectsLoading} allowCustom={allowCustom} canAddSubjects={canAddSubjects} onRegisterSubject={registerSubject} emptyMessage={emptyMessage} /></div></FormField>
          
          {examType === 'daily' && (
            <>
              <FormField label="Type"><Select value={dateFilterType} onValueChange={setDateFilterType}><SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="specific">Specific Date</SelectItem><SelectItem value="range">Date Range</SelectItem></SelectContent></Select></FormField>
              {dateFilterType === 'specific' ? <FormField label="Date"><div className="h-9"><DatePicker value={filters.testDate} onChange={(date) => setFilters({ ...filters, testDate: date })} /></div></FormField> : <><FormField label="From"><div className="h-9"><DatePicker value={filters.dateFrom} onChange={(date) => setFilters({ ...filters, dateFrom: date })} /></div></FormField><FormField label="To"><div className="h-9"><DatePicker value={filters.dateTo} onChange={(date) => setFilters({ ...filters, dateTo: date })} /></div></FormField></>}
            </>
          )}
          {examType === 'main' && (<><FormField label="Exam Type"><Select value={filters.examType} onValueChange={(v) => setFilters({ ...filters, examType: v })}><SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger><SelectContent>{MAIN_EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select></FormField><FormField label="Exam Date"><div className="h-9"><DatePicker value={filters.examDate} onChange={(date) => setFilters({ ...filters, examDate: date })} /></div></FormField></>)}
          
          <div className="flex items-end gap-2">
            <Button size="sm" onClick={() => checkAndBlock(load)} disabled={loading} className="h-9 px-6 bg-blue-600 hover:bg-blue-700">{loading ? 'Loading...' : 'Apply'}</Button>
          </div>
        </div>
      </ErpSection>

      {results && (
        <ErpSection className="override-green-grad" title="Results Data" icon={FileBarChart} tone="green">
          <div className="mb-4 relative max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm bg-white" />
          </div>
          
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white/80">
            <Table>
              <TableHeader className="bg-slate-50/50">
                {isDailyTest ? (
                  <TableRow>
                    <TableHead className="sticky left-0 bg-slate-50/50 border-r w-24">Total</TableHead>
                    <TableHead>Avg</TableHead><TableHead>Roll</TableHead><TableHead>Student</TableHead>
                    {(results.tests || []).map((t, i) => <TableHead key={t._id} className="text-center font-bold">T{i + 1}</TableHead>)}
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableHead className="w-20">Rank</TableHead><TableHead>Roll</TableHead><TableHead>Name</TableHead><TableHead>Marks</TableHead><TableHead>%</TableHead>
                  </TableRow>
                )}
              </TableHeader>
              <TableBody>
                {filteredResults.map((r, i) => (
                  <TableRow key={i} className="hover:bg-slate-50/80">
                    {isDailyTest ? (
                      <>
                        <TableCell className="sticky left-0 bg-white/80 border-r font-bold text-indigo-700">{r.totalObtained ?? 0}</TableCell>
                        <TableCell className="font-medium">{r.average ?? 0}</TableCell>
                        <TableCell>{r.student?.rollNo}</TableCell>
                        <TableCell className="font-semibold">{r.student?.name}</TableCell>
                        {(results.tests || []).map((t) => <TableCell key={t._id} className="text-center text-slate-600">{r.testMarks?.[t._id]?.marksObtained ?? '-'}</TableCell>)}
                      </>
                    ) : (
                      <>
                        <TableCell className="font-bold text-amber-600">#{r.rank ?? '-'}</TableCell>
                        <TableCell>{r.student?.rollNo}</TableCell>
                        <TableCell className="font-semibold">{r.student?.name}</TableCell>
                        <TableCell className="font-medium text-slate-700">{r.marksObtained ?? 0}<span className="text-slate-400 font-normal">/{r.maxMarks ?? 0}</span></TableCell>
                        <TableCell><span className="text-emerald-600 font-bold">{r.percentage ?? 0}%</span></TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ErpSection>
      )}

      <SubscriptionExpiredDialog open={expiredDialogOpen} onOpenChange={setExpiredDialogOpen} />
    </PageStack>
  );
}