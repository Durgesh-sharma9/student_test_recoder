import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ManageStudents() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ rollNo: '', name: '', gender: 'male' });

  useEffect(() => {
    api.get('/classes').then((r) => {
      setClasses(r.data.classes || []);
      if (r.data.classes?.length) setSelectedClass(r.data.classes[0]._id);
    });
  }, []);

  const loadStudents = async (classId) => {
    if (!classId) return;
    try {
      const res = await api.get(`/students?class=${classId}`);
      setStudents(res.data.students || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load students');
      setStudents([]);
    }
  };
  useEffect(() => { loadStudents(selectedClass); }, [selectedClass]);

  const filtered = useMemo(() => students.filter((s) => `${s.rollNo} ${s.name}`.toLowerCase().includes(query.toLowerCase())), [students, query]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, class: selectedClass };
      if (edit) await api.put(`/students/${edit._id}`, payload);
      else await api.post('/students', payload);
      toast.success(edit ? 'Student updated' : 'Student added');
      setOpen(false); setEdit(null); setForm({ rollNo: '', name: '', gender: 'male' });
      loadStudents(selectedClass);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-2xl font-semibold">Student Management</h1>
        <div className="flex gap-2">
          <Select value={selectedClass} onValueChange={setSelectedClass}><SelectTrigger className="w-56"><SelectValue placeholder="Select class" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c._id} value={c._id}>{c.className}-{c.section}</SelectItem>)}</SelectContent></Select>
          <Button onClick={() => setOpen(true)} disabled={!selectedClass}>Add Student</Button>
        </div>
      </div>
      <Card><CardContent className="pt-6 space-y-3">
        <Input placeholder="Search student" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />
        <Table><TableHeader><TableRow><TableHead>Roll No</TableHead><TableHead>Name</TableHead><TableHead>Gender</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map((s) => (
            <TableRow key={s._id}><TableCell>{s.rollNo}</TableCell><TableCell>{s.name}</TableCell><TableCell className="capitalize">{s.gender}</TableCell>
              <TableCell className="space-x-2"><Button size="sm" variant="outline" onClick={() => { setEdit(s); setForm({ rollNo: s.rollNo, name: s.name, gender: s.gender }); setOpen(true); }}>Edit</Button><Button size="sm" variant="destructive" onClick={async () => { await api.delete(`/students/${s._id}`); toast.success('Deleted'); loadStudents(selectedClass); }}>Delete</Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{edit ? 'Edit' : 'Add'} Student</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={submit}><Input placeholder="Roll No" value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} required /><Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select><Button className="w-full">{edit ? 'Save' : 'Create'}</Button></form>
      </DialogContent></Dialog>
    </div>
  );
}
