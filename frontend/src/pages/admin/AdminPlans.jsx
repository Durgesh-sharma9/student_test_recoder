import { useEffect, useMemo, useState } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/context/SubscriptionContext';
import PlanDetailsDialog from '@/components/subscription/PlanDetailsDialog';

const cycles = [
  { key: 'monthly', label: 'Monthly', months: 1 },
  { key: 'quarterly', label: '3 Months', months: 3 },
  { key: 'half_yearly', label: '6 Months', months: 6 },
  { key: 'yearly', label: '1 Year', months: 12 },
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

// Helper to get display price from plan object
// Priority: finalPrice > price > basePrice
// Never returns 0 if any valid price exists
const getDisplayPrice = (plan) => {
  const finalPrice = Number(plan?.finalPrice ?? 0);
  if (finalPrice > 0) return finalPrice;
  const price = Number(plan?.price ?? 0);
  if (price > 0) return price;
  return Number(plan?.basePrice ?? 0);
};

export default function AdminPlans() {
  const { subscription, hasPendingVerification, refresh } = useSubscription();
  const [plans, setPlans] = useState([]);
  const [activeCycle, setActiveCycle] = useState('monthly');
  const [details, setDetails] = useState({ open: false, planId: null });

  const load = async () => {
    const res = await api.get('/subscriptions/plans');
    console.log('RAW API');
    console.table(
      (res.data.plans || []).map(p => ({
        slug: p.slug,
        planType: p.planType,
        billingCycle: p.billingCycle,
        basePrice: p.basePrice,
        finalPrice: p.finalPrice,
        price: p.price,
        taxEnabled: p.tax?.enabled,
        taxPercentage: p.tax?.percentage
      }))
    );
    setPlans(res.data.plans || []);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  useEffect(() => {
    console.log('STATE');
    console.table(
      plans.map(p => ({
        slug: p.slug,
        basePrice: p.basePrice,
        finalPrice: p.finalPrice,
        price: p.price
      }))
    );
  }, [plans]);

  const groupedByType = useMemo(() => {
    const map = new Map();
    for (const p of plans) {
      const type = (p.planType || (p.slug || '').split('_')[0] || 'basic').toLowerCase();
      const list = map.get(type) || [];
      list.push(p);
      map.set(type, list);
    }
    for (const [k, v] of map.entries()) {
      v.sort((a, b) => (a.billingCycle || 'monthly').localeCompare(b.billingCycle || 'monthly'));
      map.set(k, v);
    }
    console.log('GROUPED');
    console.table(
      Array.from(map.values()).flat().map(p => ({
        slug: p.slug,
        basePrice: p.basePrice,
        finalPrice: p.finalPrice,
        price: p.price
      }))
    );
    return map;
  }, [plans]);

  const visiblePlans = useMemo(() => {
    const types = ['basic', 'standard', 'premium'];
    const result = types
      .map((t) => {
        const list = groupedByType.get(t) || [];
        return list.find((p) => (p.billingCycle || 'monthly') === activeCycle);
      })
      .filter(Boolean);
    console.log('VISIBLE');
    console.table(
      result.map(p => ({
        slug: p.slug,
        basePrice: p.basePrice,
        finalPrice: p.finalPrice,
        price: p.price
      }))
    );
    return result;
  }, [groupedByType, activeCycle]);

  const currentPlanName = subscription?.currentPlan?.name || subscription?.currentPlan?.slug || '-';
  const expiresAt = subscription?.planExpiresAt ? new Date(subscription.planExpiresAt).toLocaleDateString() : '-';

  return (
    <PageStack>
      <PageHeader title="Plans" description="Choose a plan and submit a payment request for manual verification.">
        <Button variant="outline" onClick={() => { load(); refresh().catch(() => {}); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </PageHeader>

      <ErpSection title="Your Subscription" icon={CreditCard} tone="blue">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Current Plan</p>
            <p className="mt-1 text-lg font-extrabold text-slate-900">{currentPlanName}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Valid Till</p>
            <p className="mt-1 text-lg font-extrabold text-slate-900">{expiresAt}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Status</p>
            <p className="mt-1 text-lg font-extrabold text-slate-900">
              {hasPendingVerification ? 'Pending Verification' : 'Active'}
            </p>
          </div>
        </div>
      </ErpSection>

      <ErpSection title="Available Plans" icon={CreditCard} tone="green">
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

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {visiblePlans.map((p) => {
            console.log('CARD');
            console.log('slug', p.slug);
            console.log('basePrice', p.basePrice);
            console.log('finalPrice', p.finalPrice);
            console.log('price', p.price);
            console.log('tax', p.tax);
            
            const type = (p.planType || (p.slug || '').split('_')[0] || '').toLowerCase();
            const list = groupedByType.get(type) || [];
            const monthly = list.find((x) => (x.billingCycle || 'monthly') === 'monthly');
            const cycle = cycles.find((c) => c.key === (p.billingCycle || 'monthly')) || cycles[0];
            
            // School Admin cards show Base Price only (no GST)
            const displayPrice = Number(p.basePrice ?? 0);
            const monthlyBasePrice = monthly ? Number(monthly.basePrice ?? 0) : 0;
            const save = monthlyBasePrice > 0 && displayPrice > 0 && cycle.months > 1 
              ? computeSavePercent(monthlyBasePrice, displayPrice, cycle.months) 
              : null;
            
            console.log('DISPLAY PRICE:', displayPrice);
            return (
              <div key={p._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{type.toUpperCase()}</p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">{p.name}</p>
                <p className="mt-1 text-sm text-slate-600">{cycleTitle(p.billingCycle || 'monthly')}</p>

                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Price</p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-900">₹{displayPrice.toFixed(2)}</p>
                  {save !== null ? (
                    <p className="mt-2 inline-flex rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                      Save {save}%
                    </p>
                  ) : null}
                </div>

                <Button className="mt-4 w-full" variant="success" onClick={() => setDetails({ open: true, planId: p._id })}>
                  View Details
                </Button>
              </div>
            );
          })}
        </div>
      </ErpSection>

      <PlanDetailsDialog
        open={details.open}
        onOpenChange={(v) => setDetails((s) => ({ ...s, open: v }))}
        planId={details.planId}
      />
    </PageStack>
  );
}

