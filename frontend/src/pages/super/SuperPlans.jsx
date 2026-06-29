import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CreditCard, Plus, Pencil, Settings2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUBSCRIPTION_FEATURES } from '@/lib/subscriptionFeatures';

const cycles = [
  { key: 'monthly', label: 'Monthly', months: 1 },
  { key: 'yearly', label: 'Yearly', months: 12 },
];

const planTypes = [
  { key: 'basic', label: 'Basic' },
  { key: 'standard', label: 'Standard' },
  { key: 'premium', label: 'Premium' },
  { key: 'trial', label: 'Trial' },
];

const cycleTitle = (cycle) =>
  cycle === 'quarterly' ? 'Quarterly' : cycle === 'half_yearly' ? 'Half Yearly' : cycle === 'yearly' ? 'Yearly' : 'Monthly';

const computeSavePercent = (monthlyPrice, cyclePrice, multiplier) => {
  const m = Number(monthlyPrice) || 0;
  const c = Number(cyclePrice) || 0;
  if (m <= 0 || c <= 0) return null;
  const baseline = m * multiplier;
  if (baseline <= 0) return null;
  const pct = ((baseline - c) / baseline) * 100;
  // Only show savings if there's actual discount (cycle price < baseline)
  if (c >= baseline) return null;
  return Math.max(0, Math.round(pct));
};

export default function SuperPlans() {
  const [plans, setPlans] = useState([]);
  const [activeCycle, setActiveCycle] = useState('monthly');
  const [dialog, setDialog] = useState({ open: false, mode: 'create', plan: null });
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name: '',
    billingCycle: 'monthly',
    planType: 'basic',
    basePrice: 0,
    durationDays: 30,
    isActive: true,
    taxEnabled: false,
    taxName: 'GST',
    taxPercentage: 18,
    teacherCapacityType: 'limited',
    maxTeachers: 50,
    studentCapacityType: 'limited',
    maxStudents: 500,
    highlights: ['', '', '', '', ''],
  };

  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const res = await api.get('/super-admin/plans');
    const plansData = res.data.plans || [];
    console.table(plansData.map(p => ({
      slug: p.slug,
      planType: p.planType,
      billingCycle: p.billingCycle,
      basePrice: p.basePrice,
      finalPrice: p.finalPrice,
      price: p.price,
      taxEnabled: p.tax?.enabled
    })));
    setPlans(plansData);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  // Log plans state whenever it changes
  useEffect(() => {
    console.log('[SuperPlans] plans state updated:', plans.length, 'plans');
    console.table(plans.map(p => ({
      slug: p.slug,
      planType: p.planType,
      billingCycle: p.billingCycle,
      basePrice: p.basePrice,
      finalPrice: p.finalPrice,
      price: p.price,
      taxEnabled: p.tax?.enabled
    })));
  }, [plans]);

  const groupedByType = useMemo(() => {
    const map = new Map();
    for (const p of plans) {
      const type = (p.planType || (p.slug || '').split('_')[0] || 'basic').toLowerCase();
      const list = map.get(type) || [];
      list.push(p);
      map.set(type, list);
    }
    console.log('[SuperPlans] groupedByType:', Array.from(map.entries()).map(([k, v]) => ({
      type: k,
      count: v.length,
      plans: v.map(p => ({
        slug: p.slug,
        planType: p.planType,
        billingCycle: p.billingCycle,
        basePrice: p.basePrice,
        finalPrice: p.finalPrice,
        price: p.price
      }))
    })));
    return map;
  }, [plans]);

  const visiblePlans = useMemo(() => {
    const result = ['basic', 'standard', 'premium']
      .map((t) => {
        const list = groupedByType.get(t) || [];
        // Find plan matching both planType and billingCycle
        return list.find((p) => {
          const planType = (p.planType || (p.slug || '').split('_')[0] || '').toLowerCase();
          const billingCycle = (p.billingCycle || 'monthly').toLowerCase();
          return planType === t && billingCycle === activeCycle;
        });
      })
      .filter(Boolean);
    console.log('[SuperPlans] visiblePlans for activeCycle', activeCycle, ':', result);
    return result;
  }, [groupedByType, activeCycle]);

  const openCreate = () => {
    const cycle = activeCycle;
    const durationDays = cycle === 'yearly' ? 365 : 30;
    setForm({ ...emptyForm, billingCycle: cycle, durationDays });
    setDialog({ open: true, mode: 'create', plan: null });
  };

  const openEdit = (plan) => {
    setForm({
      name: plan.name || '',
      billingCycle: plan.billingCycle || 'monthly',
      planType: plan.planType || (plan.slug || '').split('_')[0] || 'basic',
      basePrice: Number(plan.basePrice ?? plan.price ?? 0),
      durationDays: Number(plan.durationDays || 30),
      isActive: Boolean(plan.isActive),
      taxEnabled: Boolean(plan.tax?.enabled),
      taxName: plan.tax?.name || 'GST',
      taxPercentage: Number(plan.tax?.percentage ?? 0),
      teacherCapacityType: plan.teacherCapacityType || 'limited',
      maxTeachers: Number(plan.maxTeachers ?? 50),
      studentCapacityType: plan.studentCapacityType || 'limited',
      maxStudents: Number(plan.maxStudents ?? 500),
      highlights: Array.isArray(plan.highlights) ? [...plan.highlights] : ['', '', '', '', ''],
    });
    setDialog({ open: true, mode: 'edit', plan });
  };

  const taxAmount = form.taxEnabled ? (Number(form.basePrice || 0) * Number(form.taxPercentage || 0)) / 100 : 0;
  const finalPrice = Number(form.basePrice || 0) + taxAmount;

  const save = async () => {
    setSaving(true);
    try {
      const planTypeKey = String(form.planType).toLowerCase();
      const billingKey = String(form.billingCycle).toLowerCase();
      const slug = `${planTypeKey}_${billingKey}`;

      const payload = {
        slug,
        name: form.name,
        planType: planTypeKey,
        billingCycle: billingKey,
        basePrice: Number(form.basePrice || 0),
        durationDays: Number(form.durationDays || 30),
        isActive: Boolean(form.isActive),
        tax: {
          enabled: Boolean(form.taxEnabled),
          name: form.taxEnabled ? form.taxName : undefined,
          percentage: form.taxEnabled ? Number(form.taxPercentage || 0) : 0,
        },
        teacherCapacityType: form.teacherCapacityType,
        maxTeachers: form.teacherCapacityType === 'limited' ? Number(form.maxTeachers || 50) : null,
        studentCapacityType: form.studentCapacityType,
        maxStudents: form.studentCapacityType === 'limited' ? Number(form.maxStudents || 500) : null,
        highlights: form.highlights.filter(h => h.trim() !== ''),
      };

      await api.post('/super-admin/plans', payload);
      toast.success('Plan saved');
      setDialog({ open: false, mode: 'create', plan: null });
      await load(); // Await load to ensure cards refresh with latest data
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageStack>
      <PageHeader title="Plan Management" description="Create and manage subscription plans with billing cycles, tax, and feature controls.">
        <Button variant="success" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </PageHeader>

      <ErpSection title="Billing Cycles" icon={Settings2} tone="orange">
        <div className="flex flex-wrap gap-3">
          {cycles.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setActiveCycle(c.key)}
              className={
                c.key === activeCycle
                  ? 'rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:shadow-xl'
                  : 'rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-indigo-300 hover:bg-slate-50'
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </ErpSection>

      <ErpSection title={`Plans (${cycleTitle(activeCycle)})`} icon={CreditCard} tone="green">
        <div className="grid gap-6 md:grid-cols-3">
          {visiblePlans.map((p) => {
            const type = (p.planType || (p.slug || '').split('_')[0] || '').toLowerCase();
            const list = groupedByType.get(type) || [];
            const monthly = list.find((x) => (x.billingCycle || 'monthly') === 'monthly');
            const cycle = cycles.find((c) => c.key === (p.billingCycle || 'monthly')) || cycles[0];
            
            const displayPrice = Number(p.basePrice ?? p.price ?? 0);
            const monthlyDisplayPrice = monthly ? Number(monthly.basePrice ?? monthly.price ?? 0) : 0;
            const savePct = monthlyDisplayPrice > 0 && displayPrice > 0 && cycle.months > 1 
              ? computeSavePercent(monthlyDisplayPrice, displayPrice, cycle.months) 
              : null;

            const typeColors = {
              basic: 'from-blue-500 to-cyan-500',
              standard: 'from-purple-500 to-pink-500',
              premium: 'from-amber-500 to-orange-500',
            };
            const typeGradient = typeColors[type] || 'from-slate-500 to-slate-600';

            return (
              <div key={p._id} className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg transition-all hover:shadow-xl hover:border-indigo-200">
                <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${typeGradient}`} />
                
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{type.toUpperCase()}</p>
                      <p className="mt-2 text-2xl font-extrabold text-slate-900">{p.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{cycleTitle(p.billingCycle || 'monthly')}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openEdit(p)}
                      className="rounded-xl border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">₹{displayPrice.toFixed(0)}</span>
                      <span className="text-sm text-slate-500">/month</span>
                    </div>
                    {savePct !== null && (
                      <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        Save {savePct}% vs Monthly
                      </p>
                    )}
                  </div>

                  <div className="mt-6 space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Capacity</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Teachers</span>
                        <span className="font-semibold text-slate-900">
                          {p.teacherCapacityType === 'unlimited' ? 'Unlimited' : `Up to ${p.maxTeachers}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Students</span>
                        <span className="font-semibold text-slate-900">
                          {p.studentCapacityType === 'unlimited' ? 'Unlimited' : `Up to ${p.maxStudents}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {p.highlights && p.highlights.length > 0 && p.highlights.some(h => h) && (
                    <div className="mt-6">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Highlights</p>
                      <ul className="mt-3 space-y-2">
                        {p.highlights.filter(h => h).map((highlight, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {visiblePlans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm text-slate-500">No plans created for this billing cycle yet.</p>
            <Button variant="outline" className="mt-4" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Plan
            </Button>
          </div>
        ) : null}
      </ErpSection>

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog((s) => ({ ...s, open }))}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{dialog.mode === 'edit' ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
            <DialogDescription>Configure plan details, pricing, capacity limits, and highlights.</DialogDescription>
          </DialogHeader>

          <DialogBody>
          <div className="grid gap-5 p-6 pt-0 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">General</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <FormField label="Plan Name">
                    <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Premium" required />
                  </FormField>
                  <FormField label="Billing Cycle">
                    <Select value={form.billingCycle} onValueChange={(v) => setForm((s) => ({ ...s, billingCycle: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        {cycles.map((c) => (
                          <SelectItem key={c.key} value={c.key}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Plan Type">
                    <Select value={form.planType} onValueChange={(v) => setForm((s) => ({ ...s, planType: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {planTypes.map((p) => (
                          <SelectItem key={p.key} value={p.key}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Base Price">
                    <Input type="number" value={form.basePrice} onChange={(e) => setForm((s) => ({ ...s, basePrice: e.target.value }))} />
                  </FormField>
                  <FormField label="Duration (days)">
                    <Input type="number" value={form.durationDays} onChange={(e) => setForm((s) => ({ ...s, durationDays: e.target.value }))} />
                  </FormField>
                  <FormField label="Status">
                    <Select value={form.isActive ? 'active' : 'inactive'} onValueChange={(v) => setForm((s) => ({ ...s, isActive: v === 'active' }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Tax</p>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={form.taxEnabled}
                      onChange={(e) => setForm((s) => ({ ...s, taxEnabled: e.target.checked }))}
                    />
                    Apply Tax
                  </label>
                </div>

                {!form.taxEnabled ? (
                  <p className="mt-3 text-sm text-slate-500">Tax is disabled. Only Base Price will be used.</p>
                ) : (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <FormField label="Tax Name">
                      <Input value={form.taxName} onChange={(e) => setForm((s) => ({ ...s, taxName: e.target.value }))} placeholder="GST" />
                    </FormField>
                    <FormField label="Percentage">
                      <Input
                        type="number"
                        value={form.taxPercentage}
                        onChange={(e) => setForm((s) => ({ ...s, taxPercentage: e.target.value }))}
                        placeholder="18"
                      />
                    </FormField>
                    <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
                      <div className="grid gap-2 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">Base Price</p>
                          <p className="mt-1 font-bold text-slate-900">₹{Number(form.basePrice || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500">Tax Amount</p>
                          <p className="mt-1 font-bold text-slate-900">₹{Number(taxAmount || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500">Final Price</p>
                          <p className="mt-1 font-extrabold text-slate-900">₹{Number(finalPrice || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Teacher Capacity</p>
                <div className="mt-4 space-y-3">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="radio"
                        name="teacherCapacity"
                        value="unlimited"
                        checked={form.teacherCapacityType === 'unlimited'}
                        onChange={(e) => setForm((s) => ({ ...s, teacherCapacityType: e.target.value }))}
                        className="h-4 w-4"
                      />
                      Unlimited
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="radio"
                        name="teacherCapacity"
                        value="limited"
                        checked={form.teacherCapacityType === 'limited'}
                        onChange={(e) => setForm((s) => ({ ...s, teacherCapacityType: e.target.value }))}
                        className="h-4 w-4"
                      />
                      Limited
                    </label>
                  </div>
                  {form.teacherCapacityType === 'limited' && (
                    <FormField label="Number of Teachers">
                      <Input
                        type="number"
                        value={form.maxTeachers}
                        onChange={(e) => setForm((s) => ({ ...s, maxTeachers: e.target.value }))}
                        placeholder="50"
                      />
                    </FormField>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Student Capacity</p>
                <div className="mt-4 space-y-3">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="radio"
                        name="studentCapacity"
                        value="unlimited"
                        checked={form.studentCapacityType === 'unlimited'}
                        onChange={(e) => setForm((s) => ({ ...s, studentCapacityType: e.target.value }))}
                        className="h-4 w-4"
                      />
                      Unlimited
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="radio"
                        name="studentCapacity"
                        value="limited"
                        checked={form.studentCapacityType === 'limited'}
                        onChange={(e) => setForm((s) => ({ ...s, studentCapacityType: e.target.value }))}
                        className="h-4 w-4"
                      />
                      Limited
                    </label>
                  </div>
                  {form.studentCapacityType === 'limited' && (
                    <FormField label="Number of Students">
                      <Input
                        type="number"
                        value={form.maxStudents}
                        onChange={(e) => setForm((s) => ({ ...s, maxStudents: e.target.value }))}
                        placeholder="500"
                      />
                    </FormField>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Plan Highlights</p>
                <p className="mt-1 text-sm text-slate-500">Add up to 5 highlights that will appear on School Admin plan cards.</p>
                <div className="mt-4 space-y-3">
                  {form.highlights.map((highlight, index) => (
                    <FormField key={index} label={`Highlight ${index + 1}`}>
                      <Input
                        value={highlight}
                        onChange={(e) => {
                          const newHighlights = [...form.highlights];
                          newHighlights[index] = e.target.value;
                          setForm((s) => ({ ...s, highlights: newHighlights }));
                        }}
                        placeholder="e.g., Parent Portal Access"
                      />
                    </FormField>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, mode: 'create', plan: null })}>
              Cancel
            </Button>
            <Button variant="success" onClick={save} disabled={saving || !form.name}>
              Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}
