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
  const [view, setView] = useState('daily');
  const [filters, setFilters] = useState({
    classId: '',
    subject: '',
    examType: '',
    examDate: '',
    testDate: new Date().toISOString().split('T')[0],
    dateFrom: '',
    dateTo: '',
    sortBy: 'marks_desc',
  });
  const [rows, setRows] = useState([]);

  const { subjects, loading: subjectsLoading, allowCustom, canAddSubjects, registerSubject, emptyMessage } =
    useSubjects(filters.classId);

  useEffect(() => {
    api.get('/classes').then((res) => {
      const cls = res.data.classes || [];
      setClasses(cls);
      if (cls.length) setFilters((f) => ({ ...f, classId: cls[0]._id }));
    });
  }, []);

  useEffect(() => {
    setFilters((f) => ({ ...f, subject: '' }));
  }, [filters.classId]);

  const load = async () => {
    const params = { ...filters, view, category: view === 'daily' ? 'daily' : view === 'overall' ? undefined : 'main' };
    if (view === 'overall') delete params.category;
    const res = await api.get('/results', { params });
    setRows(res.data.results || []);
  };

  const download = (format) => {
    const q = buildDownloadQuery(filters, view, format);
    downloadFile(`/results/download?${q}`, `results.${format}`);
  };

  return (
    <PageStack>
      <PageHeader
        title="Results"
        description="View and export results for your assigned classes and subjects."
      />

      <ErpSection title="Filters" icon={Filter} tone="blue">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormField label="View">
            <Select value={view} onValueChange={setView}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily Test</SelectItem>
                <SelectItem value="main">Main Exam</SelectItem>
                <SelectItem value="overall">Overall</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Class">
            <Select
              value={filters.classId || undefined}
              onValueChange={(v) => setFilters({ ...filters, classId: v, subject: '' })}
            >
              <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.className}-{c.section}</SelectItem>
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
          {view === 'daily' && (
            <>
              <FormField label="Test Date">
                <Input type="date" value={filters.testDate} onChange={(e) => setFilters({ ...filters, testDate: e.target.value })} />
              </FormField>
              <FormField label="From">
                <Input type="date" placeholder="From" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
              </FormField>
              <FormField label="To">
                <Input type="date" placeholder="To" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
              </FormField>
            </>
          )}
          {view === 'main' && (
            <>
              <FormField label="Exam Type">
                <Select value={filters.examType} onValueChange={(v) => setFilters({ ...filters, examType: v })}>
                  <SelectTrigger><SelectValue placeholder="Exam Type" /></SelectTrigger>
                  <SelectContent>{MAIN_EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Exam Date">
                <Input type="date" placeholder="Exam Date" value={filters.examDate} onChange={(e) => setFilters({ ...filters, examDate: e.target.value })} />
              </FormField>
            </>
          )}
          <FormField label="Sort By">
            <Select value={filters.sortBy} onValueChange={(v) => setFilters({ ...filters, sortBy: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="marks_desc">High → Low</SelectItem>
                <SelectItem value="marks_asc">Low → High</SelectItem>
                <SelectItem value="rollNo">Roll No</SelectItem>
                <SelectItem value="name">Student Name</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <div className="flex flex-wrap items-end gap-2 md:col-span-2 lg:col-span-3">
            <Button onClick={load}>Load</Button>
            <Button variant="purple" onClick={() => download('csv')}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="purple" onClick={() => download('pdf')}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </ErpSection>

      <ErpSection title="Results" icon={FileBarChart} tone="green">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Roll</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead>%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.rank ?? '-'}</TableCell>
                  <TableCell>{r.student?.rollNo}</TableCell>
                  <TableCell className="font-medium">{r.student?.name}</TableCell>
                  <TableCell>
                    {view === 'main' && r.examDate
                      ? new Date(r.examDate).toLocaleDateString('en-GB')
                      : view === 'daily' && r.testDate
                        ? new Date(r.testDate).toLocaleDateString('en-GB')
                        : '-'}
                  </TableCell>
                  <TableCell>{(r.marksObtained ?? r.totalObtained)}/{(r.maxMarks ?? r.totalMax)}</TableCell>
                  <TableCell>{r.percentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ErpSection>
    </PageStack>
  );
}
