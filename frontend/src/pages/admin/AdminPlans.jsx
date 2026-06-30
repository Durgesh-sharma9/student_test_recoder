import { useEffect, useMemo, useState } from 'react';
import { Check, Zap, Star, Gem, CreditCard, History, Users, GraduationCap } from 'lucide-react';
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

  // Helper for DD MM YYYY format
  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  return (
    <PageStack>
      <ExpiryReminderBanner />
      
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

      {/* Redesigned Current Subscription Section */}
      {currentPlan && (
        <ErpSection title="Current Subscription" icon={CreditCard} tone="blue">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Plan */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Current Plan</p>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                currentPlan.name.toLowerCase().includes('trial') ? 'bg-green-100 text-green-800 border-green-300' : 
                currentPlan.name.toLowerCase().includes('basic') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                currentPlan.name.toLowerCase().includes('standard') ? 'bg-purple-50 text-purple-700 border-purple-200' :
                'bg-orange-50 text-orange-700 border-orange-200'
              }`}>
                {currentPlan.name.toLowerCase().includes('trial') ? `🟢 ${currentPlan.name}` : currentPlan.name}
              </div>
            </div>

            {/* Card 2: Status */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Status</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </div>
            </div>

            {/* Card 3: Expires */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Expires On</p>
              {(() => {
                const diffDays = Math.ceil((new Date(subscription?.planExpiresAt) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div>
                    <p className="text-sm font-bold text-slate-900">{formatDate(subscription?.planExpiresAt)}</p>
                    <p className={`text-[11px] font-semibold ${diffDays < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                      {diffDays < 0 ? `Expired ${Math.abs(diffDays)} days ago` : `${diffDays} days left`}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Card 4: Billing Cycle */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Billing Cycle</p>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">📅</div>
                <span className="capitalize">{currentPlan.billingCycle}</span>
              </div>
            </div>
          </div>
          
          {/* Usage Section */}
          {usage && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Teachers</p>
                      <p className="text-lg font-black text-slate-900">
                        {usage.teachers} <span className="text-slate-400 font-medium">/ {usage.teacherLimit === null ? '∞' : usage.teacherLimit}</span>
                      </p>
                    </div>
                  </div>
                  {usage.teacherLimit !== null && <span className="text-xs font-black text-indigo-600">{Math.round((usage.teachers / usage.teacherLimit) * 100)}%</span>}
                </div>
                {usage.teacherLimit !== null && (
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min((usage.teachers / usage.teacherLimit) * 100, 100)}%` }} />
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Students</p>
                      <p className="text-lg font-black text-slate-900">
                        {usage.students} <span className="text-slate-400 font-medium">/ {usage.studentLimit === null ? '∞' : usage.studentLimit}</span>
                      </p>
                    </div>
                  </div>
                  {usage.studentLimit !== null && <span className="text-xs font-black text-emerald-600">{Math.round((usage.students / usage.studentLimit) * 100)}%</span>}
                </div>
                {usage.studentLimit !== null && (
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min((usage.students / usage.studentLimit) * 100, 100)}%` }} />
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
                    <td className="px-4 py-3 text-sm text-slate-900">{formatDate(h.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 capitalize">{h.plan?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 capitalize">{h.action.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{h.expiryDate ? formatDate(h.expiryDate) : '-'}</td>
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