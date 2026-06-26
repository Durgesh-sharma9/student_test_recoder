import mongoose from 'mongoose';
import Plan from '../models/Plan.js';
import School from '../models/School.js';
import User from '../models/User.js';
import PaymentSettings from '../models/PaymentSettings.js';
import SubscriptionRequest from '../models/SubscriptionRequest.js';
import Notification from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadFile } from '../utils/imagekit.js';
import { normalizePlanPricing } from '../utils/planPricing.js';

const computeSavePercent = (monthlyPrice, cyclePrice, multiplier) => {
  const m = Number(monthlyPrice) || 0;
  const c = Number(cyclePrice) || 0;
  if (m <= 0 || c <= 0) return null;
  const baseline = m * multiplier;
  if (baseline <= 0) return null;
  const pct = ((baseline - c) / baseline) * 100;
  return Math.max(0, Math.round(pct));
};

const cycleMeta = [
  { cycle: 'monthly', label: 'Monthly', months: 1 },
  { cycle: 'quarterly', label: 'Quarterly', months: 3 },
  { cycle: 'half_yearly', label: 'Half Yearly', months: 6 },
  { cycle: 'yearly', label: 'Yearly', months: 12 },
];

export const getPlans = asyncHandler(async (req, res) => {
  const { billingCycle, planType } = req.query;
  const filter = { isActive: true };
  if (billingCycle) filter.billingCycle = billingCycle;
  if (planType) filter.planType = String(planType).toLowerCase();

  const plans = await Plan.find(filter).sort('planType billingCycle name');
  const normalized = plans.map((p) => {
    const obj = p.toObject({ virtuals: true });
    return { ...obj, ...normalizePlanPricing(obj) };
  });
  res.json({ success: true, plans: normalized });
});

export const getPlanDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid plan id');

  const plan = await Plan.findById(id);
  if (!plan || !plan.isActive) throw new ApiError(404, 'Plan not found');

  const siblings = await Plan.find({ isActive: true, planType: plan.planType }).sort('billingCycle');

  const normalizedPlan = { ...plan.toObject({ virtuals: true }), ...normalizePlanPricing(plan.toObject({ virtuals: true })) };
  const normalizedSiblings = siblings.map((p) => {
    const obj = p.toObject({ virtuals: true });
    return { ...obj, ...normalizePlanPricing(obj) };
  });

  const monthly = normalizedSiblings.find((p) => p.billingCycle === 'monthly');
  const comparison = cycleMeta.map((meta) => {
    const p = normalizedSiblings.find((s) => s.billingCycle === meta.cycle);
    const price = p?.finalPrice ?? p?.price ?? null;
    return {
      billingCycle: meta.cycle,
      label: meta.label,
      planId: p?._id,
      price,
      savePercent: monthly && p && meta.months > 1 ? computeSavePercent(monthly.finalPrice ?? monthly.price, price, meta.months) : null,
    };
  });

  res.json({
    success: true,
    plan: normalizedPlan,
    siblings: normalizedSiblings,
    comparison,
  });
});

export const getPaymentSettings = asyncHandler(async (req, res) => {
  const settings = await PaymentSettings.findOne().sort('-updatedAt -createdAt');
  res.json({
    success: true,
    settings: settings || { upiId: '', merchantName: '', qrExpiryMinutes: 5 },
  });
});

export const generateUpiQr = asyncHandler(async (req, res) => {
  const { planId, purpose } = req.body;
  if (!planId || !mongoose.Types.ObjectId.isValid(planId)) throw new ApiError(400, 'planId is required');

  const [plan, settings] = await Promise.all([
    Plan.findById(planId),
    PaymentSettings.findOne().sort('-updatedAt -createdAt'),
  ]);

  if (!plan || !plan.isActive) throw new ApiError(404, 'Plan not found');
  if (!settings?.upiId) throw new ApiError(400, 'UPI ID is not configured by Super Admin');

  // Generate a short ref to help in bank statement search (not a security token)
  const ref = `SUB${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
  const note = purpose || `School ERP Subscription - ${plan.name} (${plan.billingCycle || 'monthly'}) - ${ref}`;

  const amount = Number(plan.finalPrice ?? plan.price ?? 0).toFixed(2);
  const params = new URLSearchParams({
    pa: settings.upiId,
    pn: settings.merchantName || 'Merchant',
    am: amount,
    cu: 'INR',
    tn: note,
    tr: ref,
  });

  const upiUri = `upi://pay?${params.toString()}`;

  // Lazy import so server start doesn't fail if not used
  const qrcode = (await import('qrcode')).default;
  const dataUrl = await qrcode.toDataURL(upiUri, {
    errorCorrectionLevel: 'M',
    margin: 1,
    scale: 6,
  });

  const expiresInSeconds = (settings.qrExpiryMinutes || 5) * 60;
  res.json({ success: true, qr: { dataUrl, upiUri, expiresInSeconds, amount: Number(amount) } });
});

export const submitSubscriptionRequest = asyncHandler(async (req, res) => {
  const { planId, utr, mobileNumber, state } = req.body;

  if (!planId || !mongoose.Types.ObjectId.isValid(planId)) throw new ApiError(400, 'planId is required');
  if (!utr) throw new ApiError(400, 'UPI Transaction ID / UTR is required');

  const [school, requestedPlan] = await Promise.all([
    School.findById(req.user.school).populate('plan'),
    Plan.findById(planId),
  ]);
  if (!school) throw new ApiError(404, 'School not found');
  if (!requestedPlan || !requestedPlan.isActive) throw new ApiError(404, 'Requested plan not found');

  // Optional screenshot upload
  let paymentScreenshotUrl = null;
  let paymentScreenshotName = null;
  let paymentScreenshotType = null;

  if (req.file) {
    const uploadResult = await uploadFile(req.file, req.file.originalname, 'subscription-payments');
    paymentScreenshotUrl = uploadResult.url;
    paymentScreenshotName = req.file.originalname;
    paymentScreenshotType = req.file.mimetype;
  }

  const computedPricing = normalizePlanPricing(requestedPlan.toObject({ virtuals: true }));
  const basePrice = Number(computedPricing.basePrice ?? 0);
  const taxName = computedPricing.taxEnabled ? computedPricing.taxName : undefined;
  const taxPercentage = computedPricing.taxEnabled ? Number(computedPricing.taxPercentage ?? 0) : 0;
  const taxAmount = computedPricing.taxEnabled ? Number(computedPricing.taxAmount ?? 0) : 0;
  const finalAmount = Number(computedPricing.finalPrice ?? 0);

  const requestDoc = await SubscriptionRequest.create({
    school: school._id,
    adminUser: req.user._id,
    currentPlan: school.plan?._id,
    requestedPlan: requestedPlan._id,
    billingCycle: requestedPlan.billingCycle,
    basePrice,
    taxName,
    taxPercentage,
    taxAmount,
    finalAmount,
    mobileNumber,
    state,
    utr: String(utr).trim().toUpperCase(),
    paymentScreenshotUrl,
    paymentScreenshotName,
    paymentScreenshotType,
    status: 'pending',
    submittedAt: new Date(),
  });

  // Notify super admins about new request
  const superAdmins = await User.find({ role: 'super_admin', isActive: true }).select('_id');
  if (superAdmins.length) {
    await Notification.create({
      title: 'New payment request submitted',
      message: `${school.schoolName} submitted a payment request for ${requestedPlan.name} (${requestedPlan.billingCycle}).`,
      priority: 'important',
      senderId: req.user._id,
      senderRole: 'school_admin',
      recipientIds: superAdmins.map((u) => u._id),
      schoolId: school._id,
      targetRole: 'school_admin',
      isBroadcast: false,
    });
  }

  // Notify admin about submission (self-notification to show in panel)
  await Notification.create({
    title: 'Payment Submitted',
    message: 'Your payment request has been received. Our team will verify your payment. Please wait up to 12 hours.',
    priority: 'normal',
    senderId: req.user._id,
    senderRole: 'school_admin',
    recipientIds: [req.user._id],
    schoolId: school._id,
    targetRole: 'school_admin',
    isBroadcast: false,
  });

  res.status(201).json({
    success: true,
    request: await SubscriptionRequest.findById(requestDoc._id)
      .populate('school', 'schoolName email adminName')
      .populate('requestedPlan', 'name planType billingCycle finalPrice'),
  });
});

export const getSubscriptionStatus = asyncHandler(async (req, res) => {
  const school = await School.findById(req.user.school).populate('plan');
  if (!school) throw new ApiError(404, 'School not found');

  const pendingRequest = await SubscriptionRequest.findOne({
    school: school._id,
    status: 'pending',
  })
    .sort('-submittedAt -createdAt')
    .populate('requestedPlan', 'name planType billingCycle finalPrice');

  res.json({
    success: true,
    subscription: {
      schoolId: school._id,
      currentPlan: school.plan,
      planExpiresAt: school.planExpiresAt,
      isActive: school.isActive,
      pendingRequest,
    },
  });
});
