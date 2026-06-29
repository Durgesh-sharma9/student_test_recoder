import { useEffect, useMemo, useState } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/context/SubscriptionContext';
import PlanDetailsDialog from '@/components/subscription/PlanDetailsDialog';
import TrialRequestDialog from '@/components/subscription/TrialRequestDialog';
import EnterpriseRequestDialog from '@/components/subscription/EnterpriseRequestDialog';

const cycles = [
  { key: 'monthly', label: 'Monthly', months: 1 },
  { key: 'yearly', label: 'Yearly', months: 12 },
];

const cycleTitle = (cycle) =>
  cycle === 'yearly' ? 'Yearly' : 'Monthly';

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
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [enterpriseDialogOpen, setEnterpriseDialogOpen] = useState(false);

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

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {visiblePlans.map((p) => {
            const type = (p.planType || (p.slug || '').split('_')[0] || '').toLowerCase();
            const list = groupedByType.get(type) || [];
            const monthly = list.find((x) => (x.billingCycle || 'monthly') === 'monthly');
            const cycle = cycles.find((c) => c.key === (p.billingCycle || 'monthly')) || cycles[0];
            
            const displayPrice = Number(p.basePrice ?? 0);
            const monthlyBasePrice = monthly ? Number(monthly.basePrice ?? 0) : 0;
            const save = monthlyBasePrice > 0 && displayPrice > 0 && cycle.months > 1 
              ? computeSavePercent(monthlyBasePrice, displayPrice, cycle.months) 
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
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{type.toUpperCase()}</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">{p.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{cycleTitle(p.billingCycle || 'monthly')}</p>

                  <div className="mt-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">₹{displayPrice.toFixed(0)}</span>
                      <span className="text-sm text-slate-500">/month</span>
                    </div>
                    {save !== null && (
                      <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        Save {save}% vs Monthly
                      </p>
                    )}
                  </div>

                  {(p.teacherCapacityType === 'limited' || p.studentCapacityType === 'limited') && (
                    <div className="mt-6 space-y-2">
                      {p.teacherCapacityType === 'limited' && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Teachers</span>
                          <span className="font-semibold text-slate-900">Up to {p.maxTeachers}</span>
                        </div>
                      )}
                      {p.studentCapacityType === 'limited' && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Students</span>
                          <span className="font-semibold text-slate-900">Up to {p.maxStudents}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {p.highlights && p.highlights.length > 0 && p.highlights.some(h => h) && (
                    <div className="mt-6">
                      <ul className="space-y-2">
                        {p.highlights.filter(h => h).map((highlight, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button 
                    className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" 
                    variant="success" 
                    onClick={() => setDetails({ open: true, planId: p._id })}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ErpSection>

      <div className="mt-8 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 text-center">
          <h3 className="text-lg font-bold text-slate-900">Not sure yet?</h3>
          <p className="mt-2 text-sm text-slate-600">Try our platform risk-free with a 7-day trial or request a custom enterprise plan.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="outline" onClick={() => setTrialDialogOpen(true)}>
              Request 7-Day Trial
            </Button>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" onClick={() => setEnterpriseDialogOpen(true)}>
              Need More Capacity?
            </Button>
          </div>
        </div>
      </div>

      <PlanDetailsDialog
        open={details.open}
        onOpenChange={(v) => setDetails((s) => ({ ...s, open: v }))}
        planId={details.planId}
      />

      <TrialRequestDialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen} />
      <EnterpriseRequestDialog open={enterpriseDialogOpen} onOpenChange={setEnterpriseDialogOpen} />
    </PageStack>
  );
}

