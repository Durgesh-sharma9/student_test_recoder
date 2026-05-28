import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const examTypes = ['Daily Test', 'PA1', 'PA2', 'FA1', 'FA2'];

export default function ResultManagement() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [filters, setFilters] = useState({ classId: '', subject: '', month: '', year: new Date().getFullYear(), examType: '', teacher: '', rankingType: 'overall' });
  const [rows, setRows] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/classes'), api.get('/users?role=teacher')]).then(([c, t]) => {
      setClasses(c.data.classes || []);
      setTeachers(t.data.users || []);
    });
  }, []);

  const load = async () => {
    const res = await api.get('/results', { params: filters });
    setRows(res.data.results || []);
  };

  const toppers = useMemo(() => rows.filter((r) => r.rank === 1), [rows]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Result Management</h1>
      <Card><CardHeader><CardTitle>Filters</CardTitle></CardHeader><CardContent className="grid md:grid-cols-4 gap-2">
        <Select value={filters.classId} onValueChange={(v) => setFilters({ ...filters, classId: v })}><SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c._id} value={c._id}>{c.className}-{c.section}</SelectItem>)}</SelectContent></Select>
        <Input placeholder="Subject" value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value.toUpperCase() })} />
        <Input placeholder="Month (1-12)" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })} />
        <Input placeholder="Year" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} />
        <Select value={filters.examType} onValueChange={(v) => setFilters({ ...filters, examType: v })}><SelectTrigger><SelectValue placeholder="Exam Type" /></SelectTrigger><SelectContent>{examTypes.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
        <Select value={filters.teacher} onValueChange={(v) => setFilters({ ...filters, teacher: v })}><SelectTrigger><SelectValue placeholder="Teacher" /></SelectTrigger><SelectContent>{teachers.map((t) => <SelectItem key={t._id} value={t._id}>{t.teacherName || t.name}</SelectItem>)}</SelectContent></Select>
        <Select value={filters.rankingType} onValueChange={(v) => setFilters({ ...filters, rankingType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="overall">Overall Ranking</SelectItem><SelectItem value="subject">Subject Ranking</SelectItem></SelectContent></Select>
        <div className="flex gap-2"><Button onClick={load}>Apply Filters</Button><Button variant="outline" onClick={() => window.open(`${import.meta.env.VITE_API_URL || '/api'}/results/download?${new URLSearchParams(filters).toString()}`, '_blank')}>Download</Button></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Topper Students</CardTitle></CardHeader><CardContent>{toppers.length ? toppers.map((t, i) => <p key={i} className="text-sm">{t.student?.name} - {t.percentage}%</p>) : <p className="text-muted-foreground text-sm">No data</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Results</CardTitle></CardHeader><CardContent>
        <Table><TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Exam</TableHead><TableHead>Marks</TableHead><TableHead>Average</TableHead><TableHead>Percentage</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map((r, idx) => <TableRow key={idx}><TableCell>{r.rank}</TableCell><TableCell>{r.student?.name}</TableCell><TableCell>{r.class?.className}-{r.class?.section}</TableCell><TableCell>{r.examType}</TableCell><TableCell>{(r.totalObtained ?? r.marksObtained)}/{(r.totalMax ?? r.maxMarks)}</TableCell><TableCell>{r.average ?? '-'}</TableCell><TableCell>{r.percentage}</TableCell></TableRow>)}</TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
