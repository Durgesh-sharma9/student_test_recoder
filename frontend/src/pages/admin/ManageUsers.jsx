import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Users, UserPlus, Search } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ManageUsers() {
  const [teachers, setTeachers] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ teacherName: '', email: '', password: '', phoneNo: '' });
  const [reactivateDialog, setReactivateDialog] = useState({ open: false, teacher: null });

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
      if (edit) {
        await api.put(`/users/${edit._id}`, form);
        toast.success('Teacher updated');
        setOpen(false);
        setEdit(null);
        setForm({ teacherName: '', email: '', password: '', phoneNo: '' });
        refresh();
      } else {
        // Check if teacher with same email exists and is inactive
        const inactiveTeacher = teachers.find(t => t.email === form.email && t.status === 'Inactive');
        if (inactiveTeacher) {
          setReactivateDialog({ open: true, teacher: inactiveTeacher });
        } else {
          await api.post('/users', { ...form, role: 'teacher' });
          toast.success('Teacher created');
          setOpen(false);
          setForm({ teacherName: '', email: '', password: '', phoneNo: '' });
          refresh();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleReactivate = async () => {
    try {
      const teacher = reactivateDialog.teacher;
      await api.put(`/users/${teacher._id}`, {
        ...form,
        status: 'Active',
      });
      toast.success('Teacher reactivated successfully');
      setReactivateDialog({ open: false, teacher: null });
      setOpen(false);
      setForm({ teacherName: '', email: '', password: '', phoneNo: '' });
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reactivation failed');
    }
  };

  return (
    <PageStack>
      <PageHeader
        title="Teacher Management"
        description="Register teachers, manage credentials, and maintain your school teaching staff."
      >
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </PageHeader>

      <ErpSection title="Search Teachers" icon={Search} tone="blue">
        <FormField label="Search by name or email">
          <Input
            placeholder="Search teacher"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </FormField>
      </ErpSection>

      <ErpSection title="Teachers List" icon={Users} tone="green">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((t) => (
                <TableRow key={t._id}>
                  <TableCell className="font-medium">{t.teacherName || t.name}</TableCell>
                  <TableCell>{t.email}</TableCell>
                  <TableCell>{t.phoneNo || '-'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      t.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${t.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {t.status || 'Active'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEdit(t);
                          setForm({
                            teacherName: t.teacherName || t.name,
                            email: t.email,
                            password: '',
                            phoneNo: t.phoneNo || '',
                          });
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={t.status === 'Inactive' ? 'default' : 'destructive'}
                        onClick={async () => {
                          if (t.status === 'Inactive') {
                            // Reactivate
                            await api.put(`/users/${t._id}`, { status: 'Active' });
                            toast.success('Teacher reactivated');
                          } else {
                            // Deactivate with confirmation
                            if (confirm('Deactivate Teacher?\n\nThis teacher will no longer be able to log in but historical data will remain.')) {
                              await api.put(`/users/${t._id}`, { status: 'Inactive' });
                              toast.success('Teacher deactivated');
                            } else {
                              return;
                            }
                          }
                          refresh();
                        }}
                      >
                        {t.status === 'Inactive' ? 'Reactivate' : 'Deactivate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <span className="text-sm text-slate-600">
            {page}/{pages}
          </span>
          <Button size="sm" variant="outline" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </ErpSection>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>{edit ? 'Edit Teacher' : 'Add Teacher'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-6" onSubmit={submit}>
  <div className="grid gap-4 md:grid-cols-2">
    <FormField label="Teacher Name">
      <Input
        placeholder="Teacher Name"
        value={form.teacherName}
        onChange={(e) =>
          setForm({ ...form, teacherName: e.target.value })
        }
        className="h-12 rounded-xl"
        required
      />
    </FormField>

    <FormField label="Email">
      <Input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) =>
          setForm({ ...form, email: e.target.value })
        }
        className="h-12 rounded-xl"
        required
      />
    </FormField>

    <FormField label={edit ? "Password (optional)" : "Password"}>
      <Input
        type="password"
        placeholder={edit ? "Password (optional)" : "Password"}
        value={form.password}
        onChange={(e) =>
          setForm({ ...form, password: e.target.value })
        }
        className="h-12 rounded-xl"
        required={!edit}
      />
    </FormField>

    <FormField label="Phone No">
      <Input
        placeholder="Phone No"
        value={form.phoneNo}
        onChange={(e) =>
          setForm({ ...form, phoneNo: e.target.value })
        }
        className="h-12 rounded-xl"
        required
      />
    </FormField>
  </div>

  <Button
    className="h-12 w-full rounded-xl text-base font-semibold"
    variant={edit ? "default" : "success"}
  >
    {edit ? "Save Teacher" : "Create Teacher"}
  </Button>
</form>
        </DialogContent>
      </Dialog>

      <Dialog open={reactivateDialog.open} onOpenChange={(open) => setReactivateDialog({ open, teacher: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Teacher</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Teacher already exists and is inactive.
            </p>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="font-medium text-slate-800">{reactivateDialog.teacher?.teacherName || reactivateDialog.teacher?.name}</p>
              <p className="text-sm text-slate-600">{reactivateDialog.teacher?.email}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReactivateDialog({ open: false, teacher: null })}>
                Cancel
              </Button>
              <Button onClick={handleReactivate}>
                Reactivate Teacher
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}
