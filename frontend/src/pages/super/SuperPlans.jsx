import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CreditCard, Plus, Pencil, Settings2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUBSCRIPTION_FEATURES } from '@/lib/subscriptionFeatures';

const cycles = [
  { key: 'monthly', label: 'Monthly', months: 1 },
  { key: 'quarterly', label: '3 Months', months: 3 },
  { key: 'half_yearly', label: '6 Months', months: 6 },
  { key: 'yearly', label: '1 Year', months: 12 },
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
    features: Object.fromEntries(SUBSCRIPTION_FEATURES.map((f) => [f.key, true])),
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
    const durationDays = cycle === 'quarterly' ? 90 : cycle === 'half_yearly' ? 180 : cycle === 'yearly' ? 365 : 30;
    setForm({ ...emptyForm, billingCycle: cycle, durationDays });
    setDialog({ open: true, mode: 'create', plan: null });
  };

  const openEdit = (plan) => {
    const features = {};
    for (const f of SUBSCRIPTION_FEATURES) features[f.key] = plan.features?.[f.key] !== false;
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
      features,
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
        features: form.features,
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
        <div className="flex flex-wrap gap-2">
          {cycles.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setActiveCycle(c.key)}
              className={
                c.key === activeCycle
                  ? 'rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm'
                  : 'rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </ErpSection>

      <ErpSection title={`Plans (${cycleTitle(activeCycle)})`} icon={CreditCard} tone="green">
        <div className="grid gap-4 md:grid-cols-3">
          {visiblePlans.map((p) => {
            console.log('[SuperPlans] Rendering plan card:', {
              _id: p._id,
              name: p.name,
              billingCycle: p.billingCycle,
              basePrice: p.basePrice,
              finalPrice: p.finalPrice,
              price: p.price,
              taxEnabled: p.tax?.enabled,
            });
            
            const type = (p.planType || (p.slug || '').split('_')[0] || '').toLowerCase();
            const list = groupedByType.get(type) || [];
            const monthly = list.find((x) => (x.billingCycle || 'monthly') === 'monthly');
            const cycle = cycles.find((c) => c.key === (p.billingCycle || 'monthly')) || cycles[0];
            
            // Use displayPrice logic: finalPrice if tax enabled, else basePrice
            const getDisplayPrice = (plan) => {
              console.log('[SuperPlans] getDisplayPrice called for plan:', plan.slug, 'tax enabled:', plan.tax?.enabled, 'finalPrice:', plan.finalPrice, 'basePrice:', plan.basePrice, 'price:', plan.price);
              if (plan.tax?.enabled) {
                const result = Number(plan.finalPrice ?? plan.price ?? 0);
                console.log('[SuperPlans] getDisplayPrice returning (tax enabled):', result);
                return result;
              }
              const result = Number(plan.basePrice ?? plan.price ?? 0);
              console.log('[SuperPlans] getDisplayPrice returning (tax disabled):', result);
              return result;
            };
            
            const displayPrice = getDisplayPrice(p);
            console.log('[SuperPlans] Final displayPrice for card:', displayPrice);
            const monthlyDisplayPrice = monthly ? getDisplayPrice(monthly) : 0;
            const savePct = monthlyDisplayPrice > 0 && displayPrice > 0 && cycle.months > 1 
              ? computeSavePercent(monthlyDisplayPrice, displayPrice, cycle.months) 
              : null;
            
            const comparison = cycles.map((c) => {
              const cp = list.find((x) => (x.billingCycle || 'monthly') === c.key);
              const price = cp ? getDisplayPrice(cp) : null;
              return {
                cycle: c.key,
                label: c.key === 'quarterly' ? 'Quarterly' : c.key === 'half_yearly' ? 'Half Year' : c.key === 'yearly' ? 'Yearly' : 'Monthly',
                price,
                save: monthlyDisplayPrice > 0 && price !== null && price > 0 && c.months > 1 
                  ? computeSavePercent(monthlyDisplayPrice, price, c.months) 
                  : null,
              };
            });

            return (
              <div key={p._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{type.toUpperCase()}</p>
                    <p className="mt-1 text-xl font-extrabold text-slate-900">{p.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{cycleTitle(p.billingCycle || 'monthly')}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Price</p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-900">₹{displayPrice.toFixed(2)}</p>
                  {savePct !== null ? (
                    <p className="mt-2 inline-flex rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                      Save {savePct}%
                    </p>
                  ) : null}
                </div>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-slate-900">Comparison</p>
                  <div className="mt-2 grid gap-2">
                    {comparison.map((c) => (
                      <div key={c.cycle} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-700">{c.label}</span>
                        <span className="font-semibold text-slate-900">
                          {c.price !== null ? `₹${Number(c.price).toFixed(2)}` : '-'}
                          {c.save !== null && c.cycle !== 'monthly' ? (
                            <span className="ml-2 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                              Save {c.save}%
                            </span>
                          ) : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {visiblePlans.length === 0 ? (
          <p className="text-sm text-slate-500">No plans created for this billing cycle yet.</p>
        ) : null}
      </ErpSection>

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog((s) => ({ ...s, open }))}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{dialog.mode === 'edit' ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
            <DialogDescription>Configure general details, tax, and feature controls.</DialogDescription>
          </DialogHeader>

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

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">Feature Control</p>
              <p className="mt-1 text-sm text-slate-500">Disable a feature to show lock icons (menu stays visible).</p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {SUBSCRIPTION_FEATURES.map((f) => (
                  <label key={f.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700">{f.label}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={Boolean(form.features?.[f.key])}
                      onChange={(e) => setForm((s) => ({ ...s, features: { ...s.features, [f.key]: e.target.checked } }))}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

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
