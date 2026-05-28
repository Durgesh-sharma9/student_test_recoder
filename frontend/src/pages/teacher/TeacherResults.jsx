import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const examTypes = ['Daily Test', 'PA1', 'PA2', 'FA1', 'FA2'];

export default function TeacherResults() {
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ classId: '', subject: '', month: '', year: new Date().getFullYear(), examType: '', rankingType: 'overall' });
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get('/classes').then((res) => {
      const cls = res.data.classes || [];
      setClasses(cls);
      if (cls.length) {
        setFilters((prev) => ({ ...prev, classId: cls[0]._id }));
      }
    });
  }, []);

  const load = async () => {
    const res = await api.get('/results', { params: filters });
    setRows(res.data.results || []);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Results</h1>
      <Card><CardHeader><CardTitle>Filters</CardTitle></CardHeader><CardContent className="grid md:grid-cols-3 gap-2">
        <Select value={filters.classId} onValueChange={(v) => setFilters({ ...filters, classId: v })}>
          <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c._id} value={c._id}>{c.className}-{c.section}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Subject" value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value.toUpperCase() })} />
        <Input placeholder="Month" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })} />
        <Input placeholder="Year" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} />
        <Select value={filters.examType} onValueChange={(v) => setFilters({ ...filters, examType: v })}><SelectTrigger><SelectValue placeholder="Exam Type" /></SelectTrigger><SelectContent>{examTypes.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
        <Select value={filters.rankingType} onValueChange={(v) => setFilters({ ...filters, rankingType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="overall">Overall</SelectItem><SelectItem value="subject">Subject-wise</SelectItem></SelectContent></Select>
        <Button onClick={load}>Load Results</Button>
      </CardContent></Card>
      <Card><CardContent className="pt-6">
        <Table><TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Student</TableHead><TableHead>Marks</TableHead><TableHead>Average</TableHead><TableHead>Percentage</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map((r, idx) => <TableRow key={idx}><TableCell>{r.rank}</TableCell><TableCell>{r.student?.name}</TableCell><TableCell>{(r.totalObtained ?? r.marksObtained)}/{(r.totalMax ?? r.maxMarks)}</TableCell><TableCell>{r.average ?? '-'}</TableCell><TableCell>{r.percentage}%</TableCell></TableRow>)}</TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
