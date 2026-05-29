import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Download, Info } from 'lucide-react';
import api from '@/lib/api';
import { downloadFile } from '@/lib/download';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  if (!data?.school) {
    return (
      <PageStack>
        <p className="text-sm text-slate-500">Loading...</p>
      </PageStack>
    );
  }

  const { school, counts, isExpired } = data;

  return (
    <PageStack>
      <PageHeader title={school.schoolName} description="School details, plan management, and data export.">
        <Button variant="outline" asChild>
          <Link to="/super-admin/schools">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Teachers</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{counts.teachers}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Students</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{counts.students}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Classes</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{counts.classes}</p>
        </div>
      </div>

      <ErpSection title="School Info" icon={Info} tone="blue">
        <div className="space-y-2 text-sm text-slate-700">
          <p><strong className="text-slate-900">Admin:</strong> {school.adminName}</p>
          <p><strong className="text-slate-900">Email:</strong> {school.email}</p>
          <p><strong className="text-slate-900">Phone:</strong> {school.phone || '-'}</p>
          <p>
            <strong className="text-slate-900">Plan:</strong> {school.plan?.name || '-'}{' '}
            {isExpired && <span className="font-medium text-amber-600">(Expired)</span>}
          </p>
          <p>
            <strong className="text-slate-900">Expires:</strong>{' '}
            {school.planExpiresAt ? new Date(school.planExpiresAt).toLocaleString() : '-'}
          </p>
        </div>
      </ErpSection>

      <ErpSection title="Extend Plan" icon={Calendar} tone="orange">
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="Select plan">
            <Select value={extend.planId} onValueChange={(v) => setExtend({ ...extend, planId: v })}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Days">
            <Input
              type="number"
              className="w-32"
              placeholder="Days"
              value={extend.extendDays}
              onChange={(e) => setExtend({ ...extend, extendDays: e.target.value })}
            />
          </FormField>
          <Button onClick={extendPlan} variant="success">Apply</Button>
        </div>
      </ErpSection>

      <ErpSection title="Export Data" icon={Download} tone="purple">
        <div className="flex flex-wrap gap-3">
          {['teachers', 'students', 'classes'].map((type) => (
            <div key={type} className="flex gap-2">
              <Button variant="purple" size="sm" onClick={() => exportData(type, 'csv')}>
                {type} CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportData(type, 'pdf')}>
                {type} PDF
              </Button>
            </div>
          ))}
        </div>
      </ErpSection>
    </PageStack>
  );
}
