import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ManageClasses() {
  const [rows, setRows] = useState([]);
  const [suggestions, setSuggestions] = useState({ classSuggestions: [], sectionSuggestions: [] });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ className: '', section: '' });
  const [customClass, setCustomClass] = useState('');
  const [customSection, setCustomSection] = useState('');

  const fetchData = async () => {
    const [c, s] = await Promise.all([api.get('/classes'), api.get('/classes/suggestions')]);
    setRows(c.data.classes || []);
    setSuggestions({
      classSuggestions: s.data.classSuggestions || [],
      sectionSuggestions: s.data.sectionSuggestions || [],
    });
  };
  useEffect(() => { fetchData(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const className = (customClass || form.className || '').trim().toUpperCase();
    const section = (customSection || form.section || '').trim().toUpperCase();
    if (!className || !section) {
      return toast.error('Please select or enter class name and section');
    }
    try {
      const payload = { className, section };
      if (edit) await api.put(`/classes/${edit._id}`, payload);
      else await api.post('/classes', payload);
      toast.success(edit ? 'Class updated' : 'Class created');
      setOpen(false);
      setEdit(null);
      setForm({ className: '', section: '' });
      setCustomClass('');
      setCustomSection('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between"><h1 className="text-2xl font-semibold">Class Management</h1><Button onClick={() => setOpen(true)}>Add Class</Button></div>
      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow><TableHead>Class</TableHead><TableHead>Section</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map((c) => (
            <TableRow key={c._id}>
              <TableCell>{c.className}</TableCell><TableCell>{c.section}</TableCell>
              <TableCell className="space-x-2">
                <Button size="sm" variant="outline" onClick={() => { setEdit(c); setForm({ className: c.className, section: c.section }); setOpen(true); }}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={async () => { await api.delete(`/classes/${c._id}`); toast.success('Deleted'); fetchData(); }}>Delete</Button>
              </TableCell>
            </TableRow>))}
          </TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{edit ? 'Edit' : 'Add'} Class</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <Select value={form.className || undefined} onValueChange={(v) => { setForm({ ...form, className: v }); setCustomClass(''); }}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{suggestions.classSuggestions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Or custom class name" value={customClass} onChange={(e) => setCustomClass(e.target.value.toUpperCase())} />
          <Select value={form.section || undefined} onValueChange={(v) => { setForm({ ...form, section: v }); setCustomSection(''); }}>
            <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>{suggestions.sectionSuggestions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Or custom section" value={customSection} onChange={(e) => setCustomSection(e.target.value.toUpperCase())} />
          <Button className="w-full">{edit ? 'Update' : 'Create'}</Button>
        </form>
      </DialogContent></Dialog>
    </div>
  );
}
