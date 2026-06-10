import { useEffect, useState } from 'react';
import { Filter, FileBarChart, Download, FileText, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/api';
import { downloadFile, buildDownloadQuery } from '@/lib/download';
import { useSubjects } from '@/hooks/useSubjects';
import SubjectSelect from '@/components/SubjectSelect';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { formatDisplayDate, formatDisplayDateShort } from '@/lib/dateFormatter';
import AbsentBadge from '@/components/AbsentBadge';

const MAIN_EXAMS = ['PA1', 'PA2', 'PA3', 'PA4', 'FA1', 'FA2', 'Half Yearly', 'Final'];

export default function TeacherResults() {
  const [classes, setClasses] = useState([]);
  const [examType, setExamType] = useState('daily');
  const [filters, setFilters] = useState({
    classId: '',
    subject: '',
    examType: '',
    examDate: '',
    testDate: new Date().toISOString().split('T')[0],
    dateFrom: '',
    dateTo: '',
    sortBy: 'rollNo',
  });
  const [dateFilterType, setDateFilterType] = useState('specific');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { subjects, loading: subjectsLoading, allowCustom, canAddSubjects, registerSubject, emptyMessage } =
    useSubjects(filters.classId);

  useEffect(() => {
    api.get('/classes').then((res) => {
      const cls = res.data.classes || [];
      setClasses(cls);
    });
  }, []);

  useEffect(() => {
    setFilters((f) => ({ ...f, subject: '' }));
  }, [filters.classId]);

  // Debug log when results change
  useEffect(() => {
    if (results) {
      console.log('=== TEACHER RESULTS STATE UPDATE ===');
      console.log('Results State:', results);
      console.log('Tests Array:', results.tests);
      console.log('Tests Count:', results.tests?.length || 0);
      console.log('Test Dates:', results.tests?.map(t => t.testDate) || []);
      console.log('=== END STATE UPDATE ===');
    }
  }, [results]);

  const load = async () => {
    if (!filters.classId) return;
    
    if (examType === 'daily') {
      if (dateFilterType === 'specific' && !filters.testDate) {
        alert('Please select a test date');
        return;
      }
      if (dateFilterType === 'range' && (!filters.dateFrom || !filters.dateTo)) {
        alert('Please select date range');
        return;
      }
    }

    setLoading(true);
    try {
      const params = { 
        ...filters, 
        view: examType, 
        category: examType === 'daily' ? 'daily' : examType === 'overall' ? undefined : 'main' 
      };
      if (examType === 'overall') delete params.category;
      
      const res = await api.get('/results', { params });
      
      // DEBUG LOGS - Frontend
      console.log('=== TEACHER RESULTS FRONTEND DEBUG ===');
      console.log('API Response:', res.data);
      console.log('Tests Array:', res.data.tests);
      console.log('Tests Count:', res.data.tests?.length || 0);
      console.log('Results Count:', res.data.results?.length || 0);
      console.log('Test Dates:', res.data.tests?.map(t => t.testDate) || []);
      console.log('=== END FRONTEND DEBUG ===');
      
      setResults(res.data);
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setLoading(false);
    }
  };

  const download = (format) => {
    const q = buildDownloadQuery(filters, examType, format);
    downloadFile(`/results/download?${q}`, `results.${format}`);
  };

  const filteredResults = results?.results ? results.results.filter(
    (r) =>
      r.student?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.student?.rollNo?.toString().toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const isDailyTest = examType === 'daily';

  return (
    <PageStack className="bg-slate-50">
      <PageHeader
        title="Results"
        description="View and export results for your assigned classes and subjects."
      />

      <ErpSection title="Filters" icon={Filter} tone="blue">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <FormField label="Exam Type">
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger className="h-10 border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily Test</SelectItem>
                <SelectItem value="main">Main Exam</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Class">
            <Select
              value={filters.classId || undefined}
              onValueChange={(v) => setFilters({ ...filters, classId: v, subject: '' })}
            >
              <SelectTrigger className="h-10 border-slate-200"><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c._id} value={c._id}>Class {c.className} {c.section}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Subject">
            <SubjectSelect
              value={filters.subject}
              onChange={(subject) => setFilters({ ...filters, subject })}
              subjects={subjects}
              loading={subjectsLoading}
              allowCustom={allowCustom}
              canAddSubjects={canAddSubjects}
              onRegisterSubject={registerSubject}
              emptyMessage={emptyMessage}
              placeholder="Filter by subject"
            />
          </FormField>
          {examType === 'daily' && (
            <>
              <FormField label="Date Filter Type">
                <Select value={dateFilterType} onValueChange={setDateFilterType}>
                  <SelectTrigger className="h-10 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="specific">Specific Date</SelectItem>
                    <SelectItem value="range">Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              {dateFilterType === 'specific' ? (
                <FormField label="Test Date">
                  <Input type="date" className="h-10 border-slate-200" value={filters.testDate} onChange={(e) => setFilters({ ...filters, testDate: e.target.value })} />
                </FormField>
              ) : (
                <>
                  <FormField label="From">
                    <Input type="date" className="h-10 border-slate-200" placeholder="From" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
                  </FormField>
                  <FormField label="To">
                    <Input type="date" className="h-10 border-slate-200" placeholder="To" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
                  </FormField>
                </>
              )}
            </>
          )}
          {examType === 'main' && (
            <>
              <FormField label="Exam Type">
                <Select value={filters.examType} onValueChange={(v) => setFilters({ ...filters, examType: v })}>
                  <SelectTrigger className="h-10 border-slate-200"><SelectValue placeholder="Exam Type" /></SelectTrigger>
                  <SelectContent>{MAIN_EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Exam Date">
                <Input type="date" className="h-10 border-slate-200" placeholder="Exam Date" value={filters.examDate} onChange={(e) => setFilters({ ...filters, examDate: e.target.value })} />
              </FormField>
            </>
          )}
          <FormField label="Sort By">
            <Select value={filters.sortBy} onValueChange={(v) => setFilters({ ...filters, sortBy: v })}>
              <SelectTrigger className="h-10 border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rollNo">Roll Number</SelectItem>
                <SelectItem value="rank">Rank</SelectItem>
                <SelectItem value="name">Student Name</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <div className="flex flex-wrap items-end gap-2 md:col-span-2 lg:col-span-3 pt-2">
            <Button className="h-10 px-5 shadow-sm bg-blue-600 hover:bg-blue-700" onClick={load} disabled={loading}>
              {loading ? 'Loading...' : 'Apply'}
            </Button>
            <Button className="h-10 px-4 border border-slate-200" variant="outline" onClick={() => download('csv')}>
              <Download className="mr-2 h-4 w-4 text-purple-600" />
              CSV
            </Button>
            <Button className="h-10 px-4 border border-slate-200" variant="outline" onClick={() => download('pdf')}>
              <Download className="mr-2 h-4 w-4 text-purple-600" />
              PDF
            </Button>
          </div>
        </div>
      </ErpSection>

      {results && (
        <>
          <ErpSection title="Search" icon={Filter} tone="blue">
            <FormField label="Search by Student Name or Roll No">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </FormField>
          </ErpSection>

          <ErpSection title="Results" icon={FileBarChart} tone="green">
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
                {isDailyTest && dateFilterType === 'specific' && (
                  <div>
                    <span className="font-medium text-slate-700">Test Date:</span>{' '}
                    <span className="text-slate-600">{formatDisplayDate(filters.testDate)}</span>
                  </div>
                )}
                {isDailyTest && dateFilterType === 'range' && (
                  <div>
                    <span className="font-medium text-slate-700">Date Range:</span>{' '}
                    <span className="text-slate-600">
                      {formatDisplayDate(filters.dateFrom)} → {formatDisplayDate(filters.dateTo)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {filteredResults.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No results found</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200" style={{ minWidth: '100%' }}>
                <Table style={{ minWidth: 'max-content' }}>
                  <TableHeader>
                    {isDailyTest ? (
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
                    ) : (
                      <TableRow className="bg-slate-50/70 border-b border-slate-100">
                        <TableHead className="font-bold text-slate-700 px-5 py-4">Rank</TableHead>
                        <TableHead className="font-bold text-slate-700 px-5 py-4">Roll</TableHead>
                        <TableHead className="font-bold text-slate-700 px-5 py-4">Name</TableHead>
                        <TableHead className="font-bold text-slate-700 px-5 py-4">Date</TableHead>
                        <TableHead className="font-bold text-slate-700 px-5 py-4">Marks</TableHead>
                        <TableHead className="font-bold text-slate-700 px-5 py-4 text-center">%</TableHead>
                      </TableRow>
                    )}
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((r, index) => (
                      <TableRow key={r._id || index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}>
                        {isDailyTest ? (
                          <>
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
                                    {mark && mark.status === 'absent' ? <AbsentBadge /> : (mark ? mark.marksObtained : '')}
                                  </TableCell>
                                </>
                              );
                            })}
                          </>
                        ) : (
                          <>
                            <TableCell className="font-bold text-slate-950 px-5 py-4">{r.rank ? `#${r.rank}` : '-'}</TableCell>
                            <TableCell className="px-5 py-4 font-mono text-xs text-slate-600">{r.student?.rollNo}</TableCell>
                            <TableCell className="font-semibold text-slate-900 px-5 py-4">{r.student?.name}</TableCell>
                            <TableCell className="px-5 py-4 text-slate-600">
                              {r.examDate ? formatDisplayDate(r.examDate) : '-'}
                            </TableCell>
                            <TableCell className="px-5 py-4 font-medium text-slate-800">
                              {r.marksObtained} <span className="text-slate-400 font-normal">/</span> {r.maxMarks}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-center">
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold shadow-sm ring-1 ring-inset ${
                                r.percentage >= 80 ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                r.percentage >= 60 ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                                r.percentage >= 40 ? 'bg-amber-50 text-amber-700 ring-amber-600/20' :
                                'bg-red-50 text-red-700 ring-red-600/20'
                              }`}>
                                {r.percentage}%
                              </span>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ErpSection>
        </>
      )}
    </PageStack>
  );
}