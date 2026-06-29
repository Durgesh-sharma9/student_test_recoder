import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CreditCard, Timer, Upload, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/erp/PagePrimitives';
import { SUBSCRIPTION_FEATURES } from '@/lib/subscriptionFeatures';
import { useSubscription } from '@/context/SubscriptionContext';
import { cn } from '@/lib/utils';

const cycleLabel = (cycle) =>
  cycle === 'quarterly' ? 'Quarterly' : cycle === 'half_yearly' ? 'Half Yearly' : cycle === 'yearly' ? 'Yearly' : 'Monthly';
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

export default function PlanDetailsDialog({ open, onOpenChange, planId }) {
  const navigate = useNavigate();
  const { refresh: refreshSubscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [planData, setPlanData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [qr, setQr] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  const [form, setForm] = useState({
    mobileNumber: '',
    state: '',
    utr: '',
    screenshot: null,
  });
  const [submitted, setSubmitted] = useState(false);

  const load = async (targetPlanId = null) => {
    const idToLoad = targetPlanId || planId;
    if (!idToLoad) return;
    setLoading(true);
    try {
      const [planRes, settingsRes] = await Promise.all([
        api.get(`/subscriptions/plans/${idToLoad}`),
        api.get('/subscriptions/payment-settings'),
      ]);
      setPlanData(planRes.data);
      setSettings(settingsRes.data.settings);
      setSelectedPlanId(idToLoad);
      
      const plan = planRes.data.plan;
      console.log('DETAIL PLAN');
      console.table([{
        slug: plan.slug,
        basePrice: plan.basePrice,
        finalPrice: plan.finalPrice,
        price: plan.price,
        taxEnabled: plan.tax?.enabled,
        taxPercentage: plan.tax?.percentage
      }]);
    } finally {
      setLoading(false);
    }
  };

  const regenerateQr = async (activePlanId) => {
    if (!activePlanId) return;
    const res = await api.post('/subscriptions/upi-qr', { planId: activePlanId });
    setQr(res.data.qr);
    setSecondsLeft(res.data.qr.expiresInSeconds || 300);
  };

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setForm({ mobileNumber: '', state: '', utr: '', screenshot: null });
    setSelectedPlanId(null);
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, planId]);

  // When planData is loaded, generate QR
  useEffect(() => {
    if (!open) return;
    const activePlanId = planData?.plan?._id || planData?.plan?._id === 0 ? planData.plan._id : planId;
    if (!activePlanId) return;
    regenerateQr(activePlanId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, planData?.plan?._id]);

  // Countdown timer
  useEffect(() => {
    if (!open) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (secondsLeft === 0 && qr?.upiUri) {
      const activePlanId = planData?.plan?._id || planId;
      regenerateQr(activePlanId).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, open]);

  const plan = planData?.plan;
  const comparison = planData?.comparison || [];

  const handleComparisonClick = async (comparisonItem) => {
    if (!comparisonItem.planId || comparisonItem.planId === selectedPlanId) return;
    
    // Reset form when switching plans
    setSubmitted(false);
    setForm({ mobileNumber: '', state: '', utr: '', screenshot: null });
    
    // Load the new plan
    await load(comparisonItem.planId);
  };

  const submit = async () => {
    if (!plan?._id) return;
    if (!form.utr?.trim()) {
      toast.error('Please enter UPI Transaction ID / UTR');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('planId', plan._id);
      fd.append('utr', form.utr);
      if (form.mobileNumber) fd.append('mobileNumber', form.mobileNumber);
      if (form.state) fd.append('state', form.state);
      if (form.screenshot) fd.append('screenshot', form.screenshot);

      await api.post('/subscriptions/requests', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSubmitted(true);
      toast.success('Payment request submitted');
      refreshSubscription().catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const displayPrice = getDisplayPrice(plan); const price = displayPrice.toFixed(2);
  const taxEnabled = Boolean(plan?.tax?.enabled);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-600" />
            Plan Details
          </DialogTitle>
          <DialogDescription>View plan features and submit a manual UPI payment request.</DialogDescription>
        </DialogHeader>

        {loading && !plan ? (
          <div className="p-6 pt-0 text-sm text-slate-500">Loading...</div>
        ) : null}

        {!loading && plan ? (
          <DialogBody className="p-6 pt-0">
            <div className="grid gap-5 lg:grid-cols-2">
            {/* Left */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Plan</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{plan.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {cycleLabel(plan.billingCycle)} · {plan.planType?.toUpperCase?.() || ''}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Base Price</p>
                    <p className="mt-1 font-bold text-slate-900">₹{Number(plan.basePrice || 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Final Price</p>
                    <p className="mt-1 font-bold text-slate-900">₹{price}</p>
                  </div>
                </div>

                {taxEnabled ? (
                  <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                    Tax Applied: <span className="font-semibold">{plan.tax?.name}</span> ({plan.tax?.percentage}%)
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Features</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {SUBSCRIPTION_FEATURES.map((f) => {
                    // Fix: Read the actual feature value from plan.features Map
                    // If feature is explicitly false, show as Locked
                    // If feature is true or undefined, show as Enabled (backward compatible)
                    const featureValue = (plan.features || {})[f.key];
                    const enabled = featureValue !== false;
                    return (
                      <div
                        key={f.key}
                        className={cn(
                          'flex items-center justify-between rounded-xl border px-3 py-2 text-sm',
                          enabled ? 'border-emerald-100 bg-emerald-50/60 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-500'
                        )}
                      >
                        <span className="font-medium">{f.label}</span>
                        <span className={cn('text-xs font-semibold', enabled ? 'text-emerald-700' : 'text-slate-500')}>
                          {enabled ? 'Enabled' : 'Locked'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Comparison</p>
                <div className="mt-3 grid gap-2">
                  {comparison.map((c) => {
                    const isSelected = c.planId === selectedPlanId;
                    return (
                      <div
                        key={c.billingCycle}
                        onClick={() => handleComparisonClick(c)}
                        className={cn(
                          'flex items-center justify-between rounded-xl px-3 py-2 text-sm cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-indigo-50 border-2 border-indigo-200'
                            : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        <span className="font-medium text-slate-700">{c.label}</span>
                        <span className="font-semibold text-slate-900">
                          {c.price ? `₹${Number(c.price).toFixed(2)}` : '-'}
                          {c.savePercent !== null && c.billingCycle !== 'monthly' ? (
                            <span className="ml-2 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                              Save {c.savePercent}%
                            </span>
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Payment</p>
                {!settings?.upiId ? (
                  <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
                    Super Admin has not configured the UPI ID yet.
                  </div>
                ) : (
                  <>
                    <div className="mt-4 flex flex-col items-center gap-3">
                      {qr?.dataUrl ? (
                        <img
                          src={qr.dataUrl}
                          alt="UPI QR"
                          className="h-56 w-56 rounded-2xl border border-slate-200 bg-white p-3"
                        />
                      ) : (
                        <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
                          Generating QR...
                        </div>
                      )}
                      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        <Timer className="h-4 w-4 text-indigo-600" />
                        Expires in <span className="font-semibold">{secondsLeft}s</span>
                        <Button variant="outline" size="sm" onClick={() => regenerateQr(plan._id)} disabled={loading}>
                          Regenerate
                        </Button>
                      </div>
                    </div>

                    {!submitted ? (
                      <div className="mt-6 grid gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField label="Mobile Number">
                            <Input
                              placeholder="Optional"
                              value={form.mobileNumber}
                              onChange={(e) => setForm((s) => ({ ...s, mobileNumber: e.target.value }))}
                            />
                          </FormField>
                          <FormField label="State">
                            <Input
                              placeholder="Optional"
                              value={form.state}
                              onChange={(e) => setForm((s) => ({ ...s, state: e.target.value }))}
                            />
                          </FormField>
                        </div>

                        <FormField label="UPI Transaction ID / UTR">
                          <Input
                            placeholder="Enter UTR"
                            value={form.utr}
                            onChange={(e) => setForm((s) => ({ ...s, utr: e.target.value }))}
                            required
                          />
                        </FormField>

                        <FormField label="Payment Screenshot (Optional)">
                          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 hover:bg-slate-50">
                            <span className="flex items-center gap-2">
                              <Upload className="h-4 w-4 text-slate-500" />
                              {form.screenshot ? form.screenshot.name : 'Upload Image'}
                            </span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg"
                              className="hidden"
                              onChange={(e) => setForm((s) => ({ ...s, screenshot: e.target.files?.[0] || null }))}
                            />
                          </label>
                        </FormField>
                      </div>
                    ) : (
                      <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                            <CheckCircle2 className="h-6 w-6" />
                          </span>
                          <div>
                            <p className="text-lg font-extrabold text-emerald-900">Payment Request Submitted Successfully</p>
                            <p className="mt-1 text-sm text-emerald-800">
                              Your payment request has been received. Our team will verify your payment. Please wait up to 12 hours.
                            </p>
                            <div className="mt-3 inline-flex rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-emerald-900">
                              Status: Pending Verification
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              onOpenChange(false);
                            }}
                          >
                            Close
                          </Button>
                          <Button
                            variant="success"
                            onClick={() => {
                              onOpenChange(false);
                              navigate('/admin');
                            }}
                          >
                            Back to Dashboard
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          </DialogBody>
        ) : null}

        <DialogFooter>
          {!submitted ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button variant="success" onClick={submit} disabled={loading || !settings?.upiId}>
                Submit Payment Request
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
