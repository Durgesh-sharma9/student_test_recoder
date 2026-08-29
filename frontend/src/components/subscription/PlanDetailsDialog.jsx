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
import { firePlanActiveConfetti } from '@/utils/confetti';

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
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .razorpay-container, iframe.razorpay-checkout-frame {
        pointer-events: auto !important;
        z-index: 2147483647 !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
      const paymentSettings = settingsRes.data.settings;
      setSettings(paymentSettings);
      setSelectedPlanId(idToLoad);
      setPaymentMethod('razorpay');
      
      const plan = planRes.data.plan;
      
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
        const coupon = res.data.coupon;
        setAppliedCoupon(coupon);

        const rawBase = Number(plan?.basePrice ?? plan?.price ?? 0);
        let discount = 0;
        if (coupon.discountType === 'percentage') {
          discount = (rawBase * Number(coupon.discountValue || 0)) / 100;
        } else {
          discount = Number(coupon.discountValue || 0);
        }
        discount = Math.min(rawBase, discount);
        const discPrice = Math.max(0, rawBase - discount);

        const hasTax = Boolean(plan?.tax?.enabled);
        const taxRate = hasTax ? Number(plan?.tax?.percentage ?? 18) : 0;
        const taxAmt = hasTax ? (discPrice * taxRate) / 100 : 0;
        const finalAmt = discPrice + taxAmt;

        setPricing({
          basePrice: rawBase,
          discountAmount: discount,
          discountedPrice: discPrice,
          taxPercentage: taxRate,
          taxAmount: taxAmt,
          finalAmount: finalAmt,
          appliedCoupon: coupon,
        });

        toast.success(`Coupon "${coupon.code}" applied! (${coupon.discountValue}% OFF)`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid coupon code');
      setAppliedCoupon(null);
      setPricing(null);
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
      localStorage.setItem('pending_activation_plan_id', plan._id);
      refreshSubscription().catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async () => {
    if (!plan?._id) return;
    setLoading(true);
    try {
      const res = await api.post('/subscriptions/razorpay-order', {
        planId: plan._id,
        couponCode: form.couponCode,
      });
      
      const { order, keyId } = res.data;
      const razorpayKey = keyId || settings?.razorpayKeyId || 'rzp_test_TNFrLSunBdtmcv';

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load Razorpay SDK. Please check your internet connection.');
        setLoading(false);
        return;
      }

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: 'School ERP',
        description: `Plan Purchase: ${plan.name}`,
        order_id: order.id,
        handler: async function (response) {
          setIsRazorpayOpen(false);
          document.body.style.pointerEvents = '';
          setLoading(true);
          try {
            const verifyRes = await api.post('/subscriptions/razorpay-verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: plan._id,
              couponCode: form.couponCode,
            });

            if (verifyRes.data.success) {
              setSubmitted(true);
              toast.success('Payment verified and plan activated successfully!');
              refreshSubscription().catch(() => {});
              firePlanActiveConfetti();
            }
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          contact: form.mobileNumber || '',
        },
        theme: {
          color: '#4f46e5',
        },
        modal: {
          ondismiss: function () {
            setIsRazorpayOpen(false);
            document.body.style.pointerEvents = '';
            toast.info('Payment cancelled');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      setIsRazorpayOpen(true);
      document.body.style.pointerEvents = 'auto';
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate Razorpay payment');
      setIsRazorpayOpen(false);
      document.body.style.pointerEvents = '';
    } finally {
      setLoading(false);
    }
  };

  const taxEnabled = Boolean(plan?.tax?.enabled);
  
  // Use pricing from coupon if available, otherwise use plan pricing
  const basePrice = pricing?.basePrice || Number(plan?.basePrice ?? plan?.price ?? 0);
  const discountAmount = pricing?.discountAmount || 0;
  const discountedPrice = pricing?.discountedPrice || basePrice;
  const taxPercentage = pricing?.taxPercentage || (plan?.tax?.percentage || 0);
  const taxAmount = pricing?.taxAmount || (taxEnabled ? (discountedPrice * taxPercentage) / 100 : 0);
  const finalAmount = pricing?.finalAmount || (discountedPrice + taxAmount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-5xl max-h-[90vh] overflow-hidden"
        onPointerDownOutside={(e) => {
          if (isRazorpayOpen) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (isRazorpayOpen) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <CreditCard className="h-4 w-4" />
            </div>
            Plan Details & Upgrade
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Review features, apply valid coupon codes, and upgrade instantly via Razorpay.
          </DialogDescription>
        </DialogHeader>

        {loading && !plan ? (
          <div className="p-6 text-center text-xs font-semibold text-slate-500">Loading plan details...</div>
        ) : null}

        {!loading && plan ? (
          <DialogBody className="p-4 overflow-y-auto space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Left - Plan Details & Price Summary */}
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 uppercase tracking-wider border border-purple-100">
                        {plan.planType?.toUpperCase?.() || 'PLAN'}
                      </span>
                      <h3 className="mt-1 text-lg font-black text-slate-900">{plan.name}</h3>
                      <p className="text-xs font-medium text-slate-500">{cycleLabel(plan.billingCycle)} Subscription</p>
                    </div>
                  </div>

                  {plan.highlights && plan.highlights.length > 0 && plan.highlights.some(h => h) && (
                    <div className="mt-3.5 pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Included Features</p>
                      <ul className="mt-2 space-y-1.5">
                        {plan.highlights.filter(h => h).map((highlight, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Base Price</span>
                      <span className="font-bold text-slate-900">₹{basePrice.toFixed(2)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <>
                        <div className="flex items-center justify-between rounded-xl bg-emerald-50/90 p-2 border border-emerald-200/70 text-xs">
                          <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                            🏷️ Coupon ({appliedCoupon?.code || form.couponCode}) · {appliedCoupon?.discountValue}% OFF
                          </span>
                          <span className="font-black text-emerald-700">-₹{discountAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                          <span>Subtotal after discount</span>
                          <span className="font-bold text-slate-800">₹{discountedPrice.toFixed(2)}</span>
                        </div>
                      </>
                    )}

                    {taxEnabled && (
                      <div className="flex items-center justify-between text-xs text-amber-800 bg-amber-50/60 p-2 rounded-xl border border-amber-100">
                        <span>GST ({taxPercentage}%)</span>
                        <span className="font-bold text-amber-900">₹{taxAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 p-2.5 border border-indigo-100 shadow-sm">
                      <span className="text-xs font-black text-indigo-950">Final Payable Amount</span>
                      <span className="text-base font-black text-indigo-700">₹{finalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                  <p className="text-xs font-extrabold text-slate-900">Compare Cycles</p>
                  <div className="mt-2 space-y-1.5">
                    {comparison.map((c) => {
                      const isSelected = c.planId === selectedPlanId;
                      return (
                        <div
                          key={c.billingCycle}
                          onClick={() => handleComparisonClick(c)}
                          className={cn(
                            'flex items-center justify-between rounded-xl px-3 py-2 text-xs cursor-pointer transition-all',
                            isSelected
                              ? 'bg-indigo-50/80 border-2 border-indigo-300 font-bold text-indigo-900 shadow-xs'
                              : 'bg-slate-50 border border-slate-200/60 text-slate-600 hover:bg-slate-100/70'
                          )}
                        >
                          <span className="font-semibold">{c.label}</span>
                          <div className="flex items-center gap-1.5">
                            <span>{c.price ? `₹${Number(c.price).toFixed(2)}` : '-'}</span>
                            {c.savePercent !== null && c.billingCycle !== 'monthly' ? (
                              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">
                                Save {c.savePercent}%
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right - Payment Checkout */}
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <p className="text-xs font-extrabold text-slate-900">Online Checkout</p>
                    <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                      ⚡ Instant Activation
                    </span>
                  </div>

                  <div className="mt-3.5 flex flex-col items-center justify-center p-3.5 text-center rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-purple-50/30 to-white shadow-xs">
                    <CreditCard className="h-7 w-7 text-indigo-600 mb-1" />
                    <p className="text-xs font-black text-slate-900">100% Secure via Razorpay</p>
                    <p className="mt-0.5 text-[10px] text-slate-500 max-w-xs leading-relaxed">
                      Supports Cards, GPay, PhonePe, Paytm, Netbanking & Wallets.
                    </p>
                  </div>

                  {!submitted ? (
                    <div className="mt-4 space-y-3.5">
                      <FormField label="Mobile Number (Optional)">
                        <Input
                          placeholder="e.g. 9876543210"
                          value={form.mobileNumber}
                          onChange={(e) => setForm((s) => ({ ...s, mobileNumber: e.target.value }))}
                          className="h-9 text-xs rounded-xl border-slate-200"
                        />
                      </FormField>

                      <FormField label="Coupon Code">
                        <div className="flex gap-2">
                          <Input
                            placeholder="ENTER CODE (e.g. TTP20)"
                            value={form.couponCode}
                            onChange={(e) => setForm((s) => ({ ...s, couponCode: e.target.value.toUpperCase() }))}
                            disabled={submitted}
                            className="h-9 text-xs font-extrabold uppercase rounded-xl border-slate-200 tracking-wider"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={applyCoupon}
                            disabled={loading || !form.couponCode.trim() || submitted}
                            className="h-9 px-4 text-xs font-bold rounded-xl border-indigo-200 hover:bg-indigo-50 text-indigo-700"
                          >
                            Apply
                          </Button>
                        </div>
                        {appliedCoupon && (
                          <p className="mt-1 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            ✓ Coupon "{appliedCoupon.code}" applied ({appliedCoupon.discountValue}% discount)
                          </p>
                        )}
                      </FormField>

                      <Button
                        onClick={handleRazorpayPayment}
                        disabled={loading}
                        className="w-full h-10 text-xs font-black rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md transition-all cursor-pointer"
                      >
                        {loading ? 'Processing Payment...' : `Pay ₹${finalAmount.toFixed(2)} with Razorpay`}
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
                          <CheckCircle2 className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-black text-emerald-950">
                            Payment Successful!
                          </p>
                          <p className="mt-1 text-xs text-emerald-800 leading-relaxed font-medium">
                            Your plan has been upgraded instantly. All features are now active.
                          </p>
                          <div className="mt-2 inline-flex rounded-lg bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 border border-emerald-200">
                            Status: Active
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => onOpenChange(false)}
                          className="h-8 text-xs font-bold rounded-xl"
                        >
                          Close
                        </Button>
                        <Button
                          onClick={() => {
                            onOpenChange(false);
                            navigate('/admin');
                          }}
                          className="h-8 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Back to Dashboard
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogBody>
        ) : null}

        <DialogFooter className="py-2.5 px-4 border-t border-slate-100">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs font-bold rounded-xl">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
