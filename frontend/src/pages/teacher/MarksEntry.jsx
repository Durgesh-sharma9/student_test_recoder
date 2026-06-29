import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const examTypes = ['Daily Test', 'PA1', 'PA2', 'FA1', 'FA2'];

export default function MarksEntry() {
  const [classes, setClasses] = useState([]);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ classId: '', subject: '', month: '', year: new Date().getFullYear(), examType: 'Daily Test', maxMarks: 100 });
  const [session, setSession] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/classes'), api.get('/auth/me')]).then(([c, me]) => {
      setClasses(c.data.classes || []);
      setProfile(me.data.user);
      if (c.data.classes?.length) setForm((f) => ({ ...f, classId: c.data.classes[0]._id }));
    });
  }, []);

  const subjectOptions = useMemo(() => {
    const classId = form.classId;
    return (profile?.assignments || []).filter((a) => (a.class?._id || a.class) === classId).map((a) => a.subject);
  }, [profile, form.classId]);

  const createSession = async () => {
    const res = await api.post('/results/sessions', form);
    setSession(res.data.session);
    const m = await api.get(`/results/sessions/${res.data.session._id}/marks`);
    setRows(m.data.rows || []);
    toast.success('Session ready');
  };

  const save = async () => {
    const entries = rows.map((r) => ({ studentId: r.studentId, marksObtained: Number(r.marksObtained || 0) }));
    if (entries.some((e) => e.marksObtained > Number(form.maxMarks))) return toast.error('Marks cannot exceed max marks');
    await api.put(`/results/sessions/${session._id}/marks`, { entries });
    toast.success('Marks saved');
  };

  const download = async () => {
    const csv = ['Roll No,Name,Marks'];
    rows.forEach((r) => csv.push(`${r.rollNo},${r.name},${r.marksObtained ?? ''}`));
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `marks_${form.month}_${form.examType}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <h1 className="text-2xl font-semibold">Marks Entry</h1>
      <Card>
        <CardHeader><CardTitle className="text-lg">Create Monthly Result Session</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}><SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c._id} value={c._id}>{c.className}-{c.section}</SelectItem>)}</SelectContent></Select>
          <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}><SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent>{subjectOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Input type="number" placeholder="Month (1-12)" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
          <Input type="number" placeholder="Year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          <Select value={form.examType} onValueChange={(v) => setForm({ ...form, examType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{examTypes.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
          <Input type="number" placeholder="Max Marks" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} />
          <Button className="col-span-1 sm:col-span-2 md:col-span-3" onClick={createSession}>Load Marks Table</Button>
        </CardContent>
      </Card>

      {session && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Editable Marks Table</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-16">Roll</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-24">Marks</TableHead>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead className="w-16">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow key={r.studentId}>
                      <TableCell className="font-medium">{r.rollNo}</TableCell>
                      <TableCell className="truncate max-w-[120px]">{r.name}</TableCell>
                      <TableCell>
                        <Input 
                          type="number" className="w-20" min="0" max={form.maxMarks} 
                          value={r.marksObtained} 
                          onChange={(e) => setRows((prev) => prev.map((x, i) => i === idx ? { ...x, marksObtained: e.target.value } : x))} 
                        />
                      </TableCell>
                      <TableCell>{r.rankSubject || '-'}</TableCell>
                      <TableCell>{r.percentage || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={save} className="w-full sm:w-auto">Save Marks</Button>
              <Button variant="outline" onClick={download} className="w-full sm:w-auto">Download Data</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}