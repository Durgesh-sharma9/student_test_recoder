import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SuperPlans() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ slug: '', name: '', durationDays: 30, price: 0, maxTeachers: 50, maxStudents: 500 });

  const load = async () => {
    const res = await api.get('/super-admin/plans');
    setPlans(res.data.plans || []);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/super-admin/plans', form);
    toast.success('Plan saved');
    setForm({ slug: '', name: '', durationDays: 30, price: 0, maxTeachers: 50, maxStudents: 500 });
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Plan Management</h1>
      <Card>
        <CardHeader><CardTitle>Create / Update Plan</CardTitle></CardHeader>
        <CardContent>
          <form className="grid md:grid-cols-3 gap-2" onSubmit={submit}>
            <Input placeholder="Slug (trial)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input type="number" placeholder="Duration (days)" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
            <Input type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Input type="number" placeholder="Max Teachers" value={form.maxTeachers} onChange={(e) => setForm({ ...form, maxTeachers: e.target.value })} />
            <Input type="number" placeholder="Max Students" value={form.maxStudents} onChange={(e) => setForm({ ...form, maxStudents: e.target.value })} />
            <Button type="submit">Save Plan</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Plans</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Days</TableHead><TableHead>Price</TableHead><TableHead>Limits</TableHead></TableRow></TableHeader>
            <TableBody>
              {plans.map((p) => (
                <TableRow key={p._id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.slug}</TableCell>
                  <TableCell>{p.durationDays}</TableCell>
                  <TableCell>{p.price}</TableCell>
                  <TableCell>{p.maxTeachers} teachers / {p.maxStudents} students</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
