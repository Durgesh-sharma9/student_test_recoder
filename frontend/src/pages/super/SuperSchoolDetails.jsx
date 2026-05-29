import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/lib/api';
import { downloadFile } from '@/lib/download';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SuperSchoolDetails() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [extend, setExtend] = useState({ planId: '', extendDays: '30' });

  const load = async () => {
    const [detail, planRes] = await Promise.all([
      api.get(`/super-admin/schools/${id}`),
      api.get('/super-admin/plans'),
    ]);
    setData(detail.data);
    setPlans(planRes.data.plans || []);
  };

  useEffect(() => { load(); }, [id]);

  const extendPlan = async () => {
    await api.patch(`/super-admin/schools/${id}/plan`, {
      planId: extend.planId || undefined,
      extendDays: extend.planId ? undefined : Number(extend.extendDays),
    });
    toast.success('Plan updated');
    load();
  };

  const exportData = (type, format) => downloadFile(`/super-admin/schools/${id}/export/${type}?format=${format}`, `${type}.${format}`);

  if (!data?.school) return <p className="text-muted-foreground">Loading...</p>;
  const { school, counts, isExpired } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" asChild><Link to="/super-admin/schools">← Back</Link></Button>
        <h1 className="text-2xl font-semibold">{school.schoolName}</h1>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Teachers</p><p className="text-2xl font-bold">{counts.teachers}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Students</p><p className="text-2xl font-bold">{counts.students}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Classes</p><p className="text-2xl font-bold">{counts.classes}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>School Info</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><strong>Admin:</strong> {school.adminName}</p>
          <p><strong>Email:</strong> {school.email}</p>
          <p><strong>Phone:</strong> {school.phone || '-'}</p>
          <p><strong>Plan:</strong> {school.plan?.name || '-'} {isExpired && <span className="text-amber-600">(Expired)</span>}</p>
          <p><strong>Expires:</strong> {school.planExpiresAt ? new Date(school.planExpiresAt).toLocaleString() : '-'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Extend Plan</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Select value={extend.planId} onValueChange={(v) => setExtend({ ...extend, planId: v })}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select plan" /></SelectTrigger>
            <SelectContent>{plans.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" className="w-32" placeholder="Days" value={extend.extendDays} onChange={(e) => setExtend({ ...extend, extendDays: e.target.value })} />
          <Button onClick={extendPlan}>Apply</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Export Data</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {['teachers', 'students', 'classes'].map((type) => (
            <div key={type} className="flex gap-2">
              <Button variant="outline" onClick={() => exportData(type, 'csv')}>{type} CSV</Button>
              <Button variant="outline" onClick={() => exportData(type, 'pdf')}>{type} PDF</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
