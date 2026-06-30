import { useEffect, useMemo, useState } from 'react';
import { Check, Zap, Star, Gem, CreditCard, History, Users, GraduationCap, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { PageStack, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/context/SubscriptionContext';
import PlanDetailsDialog from '@/components/subscription/PlanDetailsDialog';
import TrialRequestDialog from '@/components/subscription/TrialRequestDialog';
import EnterpriseRequestDialog from '@/components/subscription/EnterpriseRequestDialog';
import ExpiryReminderBanner from '@/components/subscription/ExpiryReminderBanner';

export default function AdminPlans() {
  const { subscription, currentPlan, usage, refresh } = useSubscription();
  const [plans, setPlans] = useState([]);
  const [activeCycle, setActiveCycle] = useState('monthly');
  const [details, setDetails] = useState({ open: false, planId: null });
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [enterpriseDialogOpen, setEnterpriseDialogOpen] = useState(false);
  const [history, setHistory] = useState([]);

  const load = async () => {
    try {
      const res = await api.get('/subscriptions/plans');
      const filtered = (res.data?.plans || []).filter(p => 
        !p.slug?.toLowerCase().includes('trial') && Number(p.basePrice) > 0
      );
      setPlans(filtered);
    } catch (e) { console.error(e); }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get('/subscription-history');
      setHistory(res.data.history || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { 
    load(); 
    loadHistory();
  }, []);

  const visiblePlans = useMemo(() => {
    return plans
      .filter(p => (p.billingCycle || 'monthly') === activeCycle)
      .sort((a, b) => Number(a.basePrice) - Number(b.basePrice));
  }, [plans, activeCycle]);

  const getTheme = (index) => {
    const themes = [
      { border: 'border-slate-200', btn: 'bg-[#0f172a]', icon: <Zap size={22} className="text-blue-500" />, badge: null },
      { border: 'border-purple-400', btn: 'bg-purple-600', icon: <Star size={22} className="text-purple-600" />, badge: 'MOST POPULAR' },
      { border: 'border-amber-400', btn: 'bg-[#d97706]', icon: <Gem size={22} className="text-amber-500" />, badge: 'LUXURY TIER' }
    ];
    return themes[index] || themes[2];
  };

  return (
    <PageStack>
      <ExpiryReminderBanner />
      
      {/* Compact Header */}
      <div className="text-center py-2">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Choose the Perfect Plan</h1>
        <p className="text-slate-500 mt-0.5 text-sm font-medium">Scale your test records management with plans for any school size.</p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="bg-slate-100 p-1 rounded-xl flex shadow-inner">
          {['monthly', 'yearly'].map((c) => (
            <button key={c} onClick={() => setActiveCycle(c)} 
              className={`px-12 py-2 rounded-lg font-bold capitalize transition-all ${activeCycle === c ? 'bg-indigo-600 text-white shadow' : 'text-slate-500'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto px-2">
        {visiblePlans.map((p, index) => {
          const theme = getTheme(index);
          return (
            <div key={p._id} className={`bg-white rounded-3xl p-6 flex flex-col relative border-[2px] ${theme.border}`}>
              {theme.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold text-white tracking-widest ${index === 1 ? 'bg-purple-600' : 'bg-amber-500'}`}>
                  {theme.badge}
                </div>
              )}
              <div className="mb-3">{theme.icon}</div>
              <h3 className="text-xl font-bold text-slate-900 capitalize mb-1">{p.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-slate-900">₹{p.basePrice}</span>
                <span className="text-slate-500 text-sm font-medium ml-1">/month</span>
              </div>
              <p className="text-xs text-slate-500 mb-6">Ideal for growing institutes</p>
              
              <div className="space-y-3 mb-8 flex-grow">
                {p.highlights?.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-700 text-sm font-medium">
                    <Check size={16} className="text-emerald-500" /> {h}
                  </div>
                ))}
              </div>

              <Button className={`w-full ${theme.btn} text-white py-5 rounded-xl font-bold hover:opacity-90`} onClick={() => setDetails({ open: true, planId: p._id })}>
                View Details
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center space-y-2">
        <Button variant="ghost" size="sm" className="text-slate-500" onClick={() => setTrialDialogOpen(true)}>Request 7-Day Free Trial</Button>
        <div>
          <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setEnterpriseDialogOpen(true)}>
             Request Custom Enterprise Plan
          </Button>
        </div>
      </div>

      <PlanDetailsDialog open={details.open} onOpenChange={(v) => setDetails((s) => ({ ...s, open: v }))} planId={details.planId} />
      <TrialRequestDialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen} />
      <EnterpriseRequestDialog open={enterpriseDialogOpen} onOpenChange={setEnterpriseDialogOpen} />

      {/* Current Subscription Card */}
      {currentPlan && (
        <ErpSection title="Current Subscription" icon={CreditCard} tone="blue">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Current Plan</p>
              <p className="mt-1 text-lg font-extrabold text-slate-900 capitalize">{currentPlan.name}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Status</p>
              <p className="mt-1 text-lg font-extrabold text-emerald-600">Active</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Expires</p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">
                {subscription?.planExpiresAt ? new Date(subscription.planExpiresAt).toLocaleDateString() : '-'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Billing Cycle</p>
              <p className="mt-1 text-lg font-extrabold text-slate-900 capitalize">{currentPlan.billingCycle}</p>
            </div>
          </div>
          
          {/* Usage */}
          {usage && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-2.5 bg-indigo-50 text-indigo-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500">Teachers</p>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900">
                      {usage.teachers} / {usage.teacherLimit === null ? 'Unlimited' : usage.teacherLimit}
                    </p>
                  </div>
                </div>
                {usage.teacherLimit !== null && (
                  <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${usage.teachers >= usage.teacherLimit ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min((usage.teachers / usage.teacherLimit) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-2.5 bg-emerald-50 text-emerald-600">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500">Students</p>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900">
                      {usage.students} / {usage.studentLimit === null ? 'Unlimited' : usage.studentLimit}
                    </p>
                  </div>
                </div>
                {usage.studentLimit !== null && (
                  <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${usage.students >= usage.studentLimit ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min((usage.students / usage.studentLimit) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </ErpSection>
      )}

      {/* Subscription History */}
      {history.length > 0 && (
        <ErpSection title="Subscription History" icon={History} tone="purple">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h) => (
                  <tr key={h._id}>
                    <td className="px-4 py-3 text-sm text-slate-900">{new Date(h.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 capitalize">{h.plan?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 capitalize">
                      {h.action.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {h.expiryDate ? new Date(h.expiryDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ErpSection>
      )}
    </PageStack>
  );
}