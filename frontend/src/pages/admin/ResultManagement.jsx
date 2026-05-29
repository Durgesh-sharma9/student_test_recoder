import { useEffect, useMemo, useState } from 'react';
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

export default function ResultManagement() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
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

  const { subjects, loading: subjectsLoading, allowCustom, canAddSubjects, registerSubject, emptyMessage } =
    useSubjects(filters.classId);

  useEffect(() => {
    Promise.all([api.get('/classes'), api.get('/users?role=teacher')]).then(([c, t]) => {
      const cls = c.data.classes || [];
      setClasses(cls);
      setTeachers(t.data.users || []);
      if (cls.length) setFilters((f) => ({ ...f, classId: cls[0]._id }));
    });
  }, []);

  useEffect(() => {
    setFilters((f) => ({ ...f, subject: '' }));
  }, [filters.classId]);

  const load = async () => {
    const params = { ...filters, view };
    if (view === 'daily') params.category = 'daily';
    else if (view === 'main') params.category = 'main';
    const res = await api.get('/results', { params });
    setRows(res.data.results || []);
  };

  const toppers = useMemo(() => rows.filter((r) => r.rank === 1), [rows]);

  const download = (format) => {
    const q = buildDownloadQuery(filters, view, format);
    downloadFile(`/results/download?${q}`, `results.${format}`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Result Management</h1>
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
          <Select value={filters.classId} onValueChange={(v) => setFilters({ ...filters, classId: v })}>
            <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c._id} value={c._id}>{c.className}-{c.section}</SelectItem>)}</SelectContent>
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
            placeholder="All school subjects"
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
          <Select value={filters.teacher} onValueChange={(v) => setFilters({ ...filters, teacher: v })}>
            <SelectTrigger><SelectValue placeholder="Teacher" /></SelectTrigger>
            <SelectContent>{teachers.map((t) => <SelectItem key={t._id} value={t._id}>{t.teacherName || t.name}</SelectItem>)}</SelectContent>
          </Select>
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
            <Button onClick={load}>Apply</Button>
            <Button variant="outline" onClick={() => download('csv')}>CSV</Button>
            <Button variant="outline" onClick={() => download('pdf')}>PDF</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Topper Students</CardTitle></CardHeader>
        <CardContent>{toppers.length ? toppers.map((t, i) => <p key={i} className="text-sm">{t.student?.name} - {t.percentage}%</p>) : <p className="text-muted-foreground text-sm">No data</p>}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Results</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead>%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell>{r.rank ?? '-'}</TableCell>
                  <TableCell>{r.student?.name}</TableCell>
                  <TableCell>{r.class ? `${r.class.className}-${r.class.section}` : '-'}</TableCell>
                  <TableCell>{r.examType || 'Daily Test'}</TableCell>
                  <TableCell>
                    {r.examDate
                      ? new Date(r.examDate).toLocaleDateString('en-GB')
                      : r.testDate
                        ? new Date(r.testDate).toLocaleDateString('en-GB')
                        : '-'}
                  </TableCell>
                  <TableCell>{(r.totalObtained ?? r.marksObtained)}/{(r.totalMax ?? r.maxMarks)}</TableCell>
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
