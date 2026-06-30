import { useEffect, useMemo, useState } from 'react';
import { Check, Zap, Star, Gem } from 'lucide-react';
import api from '@/lib/api';
import { PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/context/SubscriptionContext';
import PlanDetailsDialog from '@/components/subscription/PlanDetailsDialog';
import TrialRequestDialog from '@/components/subscription/TrialRequestDialog';
import EnterpriseRequestDialog from '@/components/subscription/EnterpriseRequestDialog';

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [activeCycle, setActiveCycle] = useState('monthly');
  const [details, setDetails] = useState({ open: false, planId: null });
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [enterpriseDialogOpen, setEnterpriseDialogOpen] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/subscriptions/plans');
      const filtered = (res.data?.plans || []).filter(p => 
        !p.slug?.toLowerCase().includes('trial') && Number(p.basePrice) > 0
      );
      setPlans(filtered);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

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
    </PageStack>
  );
}