import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { GraduationCap, Search, UserPlus } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    <PageStack>
      <PageHeader
        title="Student Management"
        description="Manage student records by class — roll numbers, names, and profiles."
      >
        <Button onClick={() => setOpen(true)} disabled={!selectedClass}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </PageHeader>

      <ErpSection title="Select Class" icon={GraduationCap} tone="blue">
        <FormField label="Class">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full sm:max-w-xs">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.className}-{c.section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </ErpSection>

      <ErpSection title="Search Students" icon={Search} tone="blue">
        <FormField label="Search by roll no or name">
          <Input
            placeholder="Search student"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
        </FormField>
      </ErpSection>

      <ErpSection title="Students List" icon={GraduationCap} tone="green">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s._id}>
                  <TableCell>{s.rollNo}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="capitalize">{s.gender}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEdit(s);
                          setForm({ rollNo: s.rollNo, name: s.name, gender: s.gender });
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          await api.delete(`/students/${s._id}`);
                          toast.success('Deleted');
                          loadStudents(selectedClass);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ErpSection>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit ? 'Edit' : 'Add'} Student</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <FormField label="Roll No">
              <Input
                placeholder="Roll No"
                value={form.rollNo}
                onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Name">
              <Input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Gender">
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <Button className="w-full" variant={edit ? 'default' : 'success'}>
              {edit ? 'Save' : 'Create'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}
