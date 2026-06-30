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
  cycle === 'yearly' ? 'Yearly' : 'Monthly';
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
    couponCode: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [pricing, setPricing] = useState(null);

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
    const res = await api.post('/subscriptions/upi-qr', { 
      planId: activePlanId,
      couponCode: form.couponCode,
    });
    setQr(res.data.qr);
    setSecondsLeft(res.data.qr.expiresInSeconds || 300);
    setPricing(res.data.pricing);
    setAppliedCoupon(res.data.pricing?.appliedCoupon || null);
  };

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setForm({ mobileNumber: '', state: '', utr: '', screenshot: null, couponCode: '' });
    setAppliedCoupon(null);
    setPricing(null);
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
  const comparison = (planData?.comparison || []).filter(c => c.billingCycle === 'monthly' || c.billingCycle === 'yearly');

  const handleComparisonClick = async (comparisonItem) => {
    if (!comparisonItem.planId || comparisonItem.planId === selectedPlanId) return;
    
    // Reset form when switching plans
    setSubmitted(false);
    setForm({ mobileNumber: '', state: '', utr: '', screenshot: null, couponCode: '' });
    setAppliedCoupon(null);
    setPricing(null);
    
    // Load the new plan
    await load(comparisonItem.planId);
  };

  const applyCoupon = async () => {
    if (!form.couponCode.trim()) {
      setAppliedCoupon(null);
      setPricing(null);
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.post('/coupons/validate', {
        code: form.couponCode.trim(),
        planType: plan?.planType,
      });
      
      if (res.data.success) {
        setAppliedCoupon(res.data.coupon);
        // Regenerate QR with coupon
        await regenerateQr(selectedPlanId);
        toast.success('Coupon applied successfully');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid coupon');
      setAppliedCoupon(null);
    } finally {
      setLoading(false);
    }
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
      if (form.couponCode) fd.append('couponCode', form.couponCode);

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

  const displayPrice = getDisplayPrice(plan);
  const price = displayPrice.toFixed(2);
  const taxEnabled = Boolean(plan?.tax?.enabled);
  
  // Use pricing from coupon if available, otherwise use plan pricing
  const basePrice = pricing?.basePrice || displayPrice;
  const discountAmount = pricing?.discountAmount || 0;
  const discountedPrice = pricing?.discountedPrice || basePrice;
  const taxPercentage = pricing?.taxPercentage || (plan?.tax?.percentage || 18);
  const taxAmount = pricing?.taxAmount || (taxEnabled ? (basePrice * taxPercentage) / 100 : 0);
  const finalAmount = pricing?.finalAmount || (basePrice + taxAmount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-indigo-600" />
            Plan Details
          </DialogTitle>
          <DialogDescription className="text-sm">View plan features and submit a manual UPI payment request.</DialogDescription>
        </DialogHeader>

        {loading && !plan ? (
          <div className="p-4 pt-0 text-sm text-slate-500">Loading...</div>
        ) : null}

        {!loading && plan ? (
          <DialogBody className="p-4 pt-0 overflow-y-auto">
            <div className="grid gap-4 lg:grid-cols-2">
            {/* Left - Plan Details */}
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Plan</p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">{plan.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {cycleLabel(plan.billingCycle)} · {plan.planType?.toUpperCase?.() || ''}
                </p>

                {plan.highlights && plan.highlights.length > 0 && plan.highlights.some(h => h) && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Highlights</p>
                    <ul className="mt-2 space-y-1">
                      {plan.highlights.filter(h => h).map((highlight, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <span className="mt-1 h-1 w-1 rounded-full bg-emerald-500" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-xs font-medium text-slate-600">Base Price</span>
                    <span className="text-sm font-bold text-slate-900">₹{basePrice.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                      <span className="text-xs font-medium text-emerald-700">Coupon Discount</span>
                      <span className="text-sm font-bold text-emerald-900">-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {taxEnabled && (
                    <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                      <span className="text-xs font-medium text-amber-700">GST ({taxPercentage}%)</span>
                      <span className="text-sm font-bold text-amber-900">₹{taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2">
                    <span className="text-xs font-semibold text-indigo-700">Final Price</span>
                    <span className="text-lg font-extrabold text-indigo-900">₹{finalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-900">Compare Plans</p>
                <div className="mt-3 space-y-1">
                  {comparison.map((c) => {
                    const isSelected = c.planId === selectedPlanId;
                    return (
                      <div
                        key={c.billingCycle}
                        onClick={() => handleComparisonClick(c)}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-3 py-2 text-xs cursor-pointer transition-all',
                          isSelected
                            ? 'bg-indigo-50 border-2 border-indigo-200'
                            : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        <span className="font-medium text-slate-700">{c.label}</span>
                        <span className="font-semibold text-slate-900">
                          {c.price ? `₹${Number(c.price).toFixed(2)}` : '-'}
                          {c.savePercent !== null && c.billingCycle !== 'monthly' ? (
                            <span className="ml-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
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

            {/* Right - Payment */}
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-900">Payment</p>
                {!settings?.upiId ? (
                  <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">
                    Super Admin has not configured the UPI ID yet.
                  </div>
                ) : (
                  <>
                    <div className="mt-4 flex flex-col items-center gap-3">
                      {qr?.dataUrl ? (
                        <img
                          src={qr.dataUrl}
                          alt="UPI QR"
                          className="h-56 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
                        />
                      ) : (
                        <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500">
                          Generating QR...
                        </div>
                      )}
                      <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2 text-xs text-slate-700">
                        <Timer className="h-4 w-4 text-indigo-600" />
                        Expires in <span className="font-bold text-indigo-900">{secondsLeft}s</span>
                        <Button variant="outline" size="sm" onClick={() => regenerateQr(plan._id)} disabled={loading} className="h-7 px-2 text-xs">
                          Regenerate
                        </Button>
                      </div>
                    </div>

                    {!submitted ? (
                      <div className="mt-4 space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <FormField label="Mobile Number">
                            <Input
                              placeholder="Optional"
                              value={form.mobileNumber}
                              onChange={(e) => setForm((s) => ({ ...s, mobileNumber: e.target.value }))}
                              className="h-9 text-sm"
                            />
                          </FormField>
                          <FormField label="State">
                            <Input
                              placeholder="Optional"
                              value={form.state}
                              onChange={(e) => setForm((s) => ({ ...s, state: e.target.value }))}
                              className="h-9 text-sm"
                            />
                          </FormField>
                        </div>

                        <FormField label="Coupon Code (Optional)">
                          <div className="flex gap-2">
                            <Input
                              placeholder="TTP20"
                              value={form.couponCode}
                              onChange={(e) => setForm((s) => ({ ...s, couponCode: e.target.value.toUpperCase() }))}
                              disabled={submitted}
                              className="h-9 text-sm"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={applyCoupon}
                              disabled={loading || !form.couponCode.trim() || submitted}
                              className="h-9 px-3 text-xs"
                            >
                              Apply
                            </Button>
                          </div>
                          {appliedCoupon && (
                            <p className="mt-0.5 text-[10px] text-emerald-600">
                              Coupon applied: {appliedCoupon.discountValue}% discount
                            </p>
                          )}
                        </FormField>

                        <FormField label="UPI Transaction ID / UTR">
                          <Input
                            placeholder="Enter UTR"
                            value={form.utr}
                            onChange={(e) => setForm((s) => ({ ...s, utr: e.target.value }))}
                            required
                            className="h-9 text-sm"
                          />
                        </FormField>

                        <FormField label="Payment Screenshot (Optional)">
                          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                            <span className="flex items-center gap-2">
                              <Upload className="h-3 w-3 text-slate-500" />
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

                        <Button onClick={submit} disabled={loading} className="w-full h-10 text-sm">
                          {loading ? 'Submitting...' : 'Submit Payment Request'}
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
                            <CheckCircle2 className="h-6 w-6" />
                          </span>
                          <div>
                            <p className="text-sm font-extrabold text-emerald-900">Payment Request Submitted Successfully</p>
                            <p className="mt-1 text-xs text-emerald-800">
                              Your payment request has been received. Our team will verify your payment. Please wait up to 12 hours.
                            </p>
                            <div className="mt-2 inline-flex rounded-lg bg-white/70 px-3 py-1 text-xs font-semibold text-emerald-900">
                              Status: Pending Verification
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              onOpenChange(false);
                            }}
                            className="h-8 text-xs"
                          >
                            Close
                          </Button>
                          <Button
                            variant="success"
                            onClick={() => {
                              onOpenChange(false);
                              navigate('/admin');
                            }}
                            className="h-8 text-xs"
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
