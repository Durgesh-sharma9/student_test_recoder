import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { downloadFile, buildDownloadQuery } from '@/lib/download';
import { useSubjects } from '@/hooks/useSubjects';
import SubjectSelect from '@/components/SubjectSelect';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Results</h1>
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-2">
          <Select value={view} onValueChange={setView}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily Test</SelectItem>
              <SelectItem value="main">Main Exam</SelectItem>
              <SelectItem value="overall">Overall</SelectItem>
            </SelectContent>
          </Select>
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
          {view === 'daily' && (
            <>
              <Input type="date" value={filters.testDate} onChange={(e) => setFilters({ ...filters, testDate: e.target.value })} />
              <Input type="date" placeholder="From" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
              <Input type="date" placeholder="To" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
            </>
          )}
          {view === 'main' && (
            <>
              <Select value={filters.examType} onValueChange={(v) => setFilters({ ...filters, examType: v })}>
                <SelectTrigger><SelectValue placeholder="Exam Type" /></SelectTrigger>
                <SelectContent>{MAIN_EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" placeholder="Exam Date" value={filters.examDate} onChange={(e) => setFilters({ ...filters, examDate: e.target.value })} />
            </>
          )}
          <Select value={filters.sortBy} onValueChange={(v) => setFilters({ ...filters, sortBy: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="marks_desc">High → Low</SelectItem>
              <SelectItem value="marks_asc">Low → High</SelectItem>
              <SelectItem value="rollNo">Roll No</SelectItem>
              <SelectItem value="name">Student Name</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={load}>Load</Button>
            <Button variant="outline" onClick={() => download('csv')}>CSV</Button>
            <Button variant="outline" onClick={() => download('pdf')}>PDF</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
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
                  <TableCell>{r.student?.name}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
