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
  const [rows, setRows] = useState([]);

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

  const load = async () => {
    const params = { 
      ...filters, 
      view: examType, 
      category: examType === 'daily' ? 'daily' : examType === 'overall' ? undefined : 'main' 
    };
    if (examType === 'overall') delete params.category;
    const res = await api.get('/results', { params });
    setRows(res.data.results || []);
  };

  const download = (format) => {
    const q = buildDownloadQuery(filters, examType, format);
    downloadFile(`/results/download?${q}`, `results.${format}`);
  };

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
            <Button className="h-10 px-5 shadow-sm bg-blue-600 hover:bg-blue-700" onClick={load}>Apply</Button>
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

      <ErpSection title="Results" icon={FileBarChart} tone="green">
        <div className="overflow-x-auto bg-white rounded-xl border border-slate-100 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 border-b border-slate-100">
                <TableHead className="font-bold text-slate-700 px-5 py-4">Rank</TableHead>
                <TableHead className="font-bold text-slate-700 px-5 py-4">Roll</TableHead>
                <TableHead className="font-bold text-slate-700 px-5 py-4">Name</TableHead>
                <TableHead className="font-bold text-slate-700 px-5 py-4">Date</TableHead>
                <TableHead className="font-bold text-slate-700 px-5 py-4">Marks</TableHead>
                <TableHead className="font-bold text-slate-700 px-5 py-4 text-center">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                    No items found. Adjust filters and apply.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, i) => (
                  <TableRow key={i} className="hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-all border-b border-slate-100 group">
                    <TableCell className="font-bold text-slate-950 px-5 py-4 group-hover:text-blue-600 transition-colors">
                      {r.rank ? `#${r.rank}` : '-'}
                    </TableCell>
                    <TableCell className="px-5 py-4 font-mono text-xs text-slate-600 group-hover:text-slate-900">{r.student?.rollNo}</TableCell>
                    <TableCell className="font-semibold text-slate-900 px-5 py-4 group-hover:text-blue-600 transition-colors">{r.student?.name}</TableCell>
                    <TableCell className="px-5 py-4 text-slate-600 group-hover:text-slate-900">
                      {examType === 'main' && r.examDate
                        ? new Date(r.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : examType === 'daily' && r.testDate
                          ? new Date(r.testDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '-'}
                    </TableCell>
                    <TableCell className="px-5 py-4 font-medium text-slate-800">
                      {(r.marksObtained ?? r.totalObtained)} <span className="text-slate-400 font-normal">/</span> {(r.maxMarks ?? r.totalMax)}
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