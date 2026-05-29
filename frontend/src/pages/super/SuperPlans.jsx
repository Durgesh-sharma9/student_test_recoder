import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CreditCard, Plus } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <PageStack>
      <PageHeader
        title="Plan Management"
        description="Create and manage subscription plans for schools."
      />

      <ErpSection title="Create / Update Plan" icon={Plus} tone="orange">
        <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" onSubmit={submit}>
          <FormField label="Slug">
            <Input placeholder="Slug (trial)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
          </FormField>
          <FormField label="Name">
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="Duration (days)">
            <Input type="number" placeholder="Duration (days)" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
          </FormField>
          <FormField label="Price">
            <Input type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </FormField>
          <FormField label="Max Teachers">
            <Input type="number" placeholder="Max Teachers" value={form.maxTeachers} onChange={(e) => setForm({ ...form, maxTeachers: e.target.value })} />
          </FormField>
          <FormField label="Max Students">
            <Input type="number" placeholder="Max Students" value={form.maxStudents} onChange={(e) => setForm({ ...form, maxStudents: e.target.value })} />
          </FormField>
          <div className="flex items-end md:col-span-2 lg:col-span-3">
            <Button type="submit" variant="success">
              <Plus className="mr-2 h-4 w-4" />
              Save Plan
            </Button>
          </div>
        </form>
      </ErpSection>

      <ErpSection title="Plans" icon={CreditCard} tone="green">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Limits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.slug}</TableCell>
                  <TableCell>{p.durationDays}</TableCell>
                  <TableCell>{p.price}</TableCell>
                  <TableCell>{p.maxTeachers} teachers / {p.maxStudents} students</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ErpSection>
    </PageStack>
  );
}
