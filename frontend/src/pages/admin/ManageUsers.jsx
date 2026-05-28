import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ManageUsers() {
  const [teachers, setTeachers] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ teacherName: '', email: '', password: '', phoneNo: '' });

  useEffect(() => {
    api.get('/users?role=teacher').then((res) => setTeachers(res.data.users || []));
  }, []);

  const filtered = useMemo(() => teachers.filter((t) => `${t.teacherName || t.name} ${t.email}`.toLowerCase().includes(query.toLowerCase())), [teachers, query]);
  const perPage = 8;
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));

  const refresh = async () => {
    const res = await api.get('/users?role=teacher');
    setTeachers(res.data.users || []);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (edit) await api.put(`/users/${edit._id}`, form);
      else await api.post('/users', { ...form, role: 'teacher' });
      toast.success(edit ? 'Teacher updated' : 'Teacher created');
      setOpen(false);
      setEdit(null);
      setForm({ teacherName: '', email: '', password: '', phoneNo: '' });
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-2xl font-semibold">Teacher Management</h1>
        <Button onClick={() => setOpen(true)}>Add Teacher</Button>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Teachers</CardTitle>
          <Input className="max-w-xs" placeholder="Search teacher" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>{paged.map((t) => (
              <TableRow key={t._id}>
                <TableCell>{t.teacherName || t.name}</TableCell>
                <TableCell>{t.email}</TableCell>
                <TableCell>{t.phoneNo || '-'}</TableCell>
                <TableCell className="space-x-2">
                  <Button size="sm" variant="outline" onClick={() => { setEdit(t); setForm({ teacherName: t.teacherName || t.name, email: t.email, password: '', phoneNo: t.phoneNo || '' }); setOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={async () => { await api.delete(`/users/${t._id}`); toast.success('Teacher deleted'); refresh(); }}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
          <div className="flex justify-end gap-2 mt-4">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="text-sm">{page}/{pages}</span>
            <Button size="sm" variant="outline" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{edit ? 'Edit Teacher' : 'Add Teacher'}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <Input placeholder="Teacher Name" value={form.teacherName} onChange={(e) => setForm({ ...form, teacherName: e.target.value })} required />
          <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input type="password" placeholder={edit ? 'Password (optional)' : 'Password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!edit} />
          <Input placeholder="Phone No" value={form.phoneNo} onChange={(e) => setForm({ ...form, phoneNo: e.target.value })} required />
          <Button className="w-full">{edit ? 'Save' : 'Create'}</Button>
        </form>
      </DialogContent></Dialog>
    </div>
  );
}
