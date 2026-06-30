import mongoose from 'mongoose';
import Plan from '../models/Plan.js';
import School from '../models/School.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import PaymentSettings from '../models/PaymentSettings.js';
import SubscriptionRequest from '../models/SubscriptionRequest.js';
import SubscriptionHistory from '../models/SubscriptionHistory.js';
import Coupon from '../models/Coupon.js';
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
  // Only show savings if there's actual discount (cycle price < baseline)
  if (c >= baseline) return null;
  return Math.max(0, Math.round(pct));
};

const cycleMeta = [
  { cycle: 'monthly', label: 'Monthly', months: 1 },
  
  { cycle: 'yearly', label: 'Yearly', months: 12 },
];

export const getPlans = asyncHandler(async (req, res) => {
  const { billingCycle, planType } = req.query;
  const filter = { isActive: true };
  if (billingCycle) filter.billingCycle = billingCycle;
  if (planType) filter.planType = String(planType).toLowerCase();

  const plans = await Plan.find(filter).sort('planType billingCycle name');
  
  console.log('[getPlans] Raw plans from database:', JSON.stringify(plans.map(p => ({
    _id: p._id,
    slug: p.slug,
    planType: p.planType,
    billingCycle: p.billingCycle,
    basePrice: p.basePrice,
    finalPrice: p.finalPrice,
    price: p.price,
    tax: p.tax,
  })), null, 2));
  
  const normalized = plans.map((p) => {
    const obj = p.toObject({ virtuals: true });
    return { ...obj, ...normalizePlanPricing(obj) };
  });
  
  console.log('[getPlans] Normalized plans:', JSON.stringify(normalized.map(p => ({
    _id: p._id,
    slug: p.slug,
    planType: p.planType,
    billingCycle: p.billingCycle,
    basePrice: p.basePrice,
    finalPrice: p.finalPrice,
    price: p.price,
    tax: p.tax,
  })), null, 2));
  
  res.json({ success: true, plans: normalized });
});

export const getPlanDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid plan id');

  const plan = await Plan.findById(id);
  if (!plan || !plan.isActive) throw new ApiError(404, 'Plan not found');

  console.log('[getPlanDetails] Raw plan from database:', JSON.stringify(plan.toObject({
    _id: plan._id,
    slug: plan.slug,
    planType: plan.planType,
    billingCycle: plan.billingCycle,
    basePrice: plan.basePrice,
    finalPrice: plan.finalPrice,
    price: plan.price,
    tax: plan.tax,
  }), null, 2));

  const siblings = await Plan.find({ isActive: true, planType: plan.planType }).sort('billingCycle');

  const normalizedPlan = { ...plan.toObject({ virtuals: true }), ...normalizePlanPricing(plan.toObject({ virtuals: true })) };
  const normalizedSiblings = siblings.map((p) => {
    const obj = p.toObject({ virtuals: true });
    return { ...obj, ...normalizePlanPricing(obj) };
  });

  console.log('[getPlanDetails] Normalized plan:', JSON.stringify({
    _id: normalizedPlan._id,
    slug: normalizedPlan.slug,
    planType: normalizedPlan.planType,
    billingCycle: normalizedPlan.billingCycle,
    basePrice: normalizedPlan.basePrice,
    finalPrice: normalizedPlan.finalPrice,
    price: normalizedPlan.price,
    tax: normalizedPlan.tax,
  }, null, 2));

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

  console.log('[getPlanDetails] Comparison:', JSON.stringify(comparison, null, 2));

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
  const { planId, purpose, couponCode } = req.body;
  if (!planId || !mongoose.Types.ObjectId.isValid(planId)) throw new ApiError(400, 'planId is required');

  const [plan, settings] = await Promise.all([
    Plan.findById(planId),
    PaymentSettings.findOne().sort('-updatedAt -createdAt'),
  ]);

  if (!plan || !plan.isActive) throw new ApiError(404, 'Plan not found');
  if (!settings?.upiId) throw new ApiError(400, 'UPI ID is not configured by Super Admin');

  // Calculate base price
  let basePrice = Number(plan.finalPrice ?? plan.price ?? 0);
  let discountAmount = 0;
  let appliedCoupon = null;

  // Validate and apply coupon if provided
  if (couponCode && couponCode.trim()) {
    const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
    
    if (coupon) {
      // Check if coupon is valid
      if (!coupon.isActive) {
        throw new ApiError(400, 'Coupon is disabled');
      }
      if (coupon.isExpired) {
        throw new ApiError(400, 'Coupon has expired');
      }
      if (coupon.isUsageLimitReached) {
        throw new ApiError(400, 'Coupon usage limit reached');
      }
      
      // Check if coupon is applicable to the plan type
      if (coupon.applicablePlans && coupon.applicablePlans.length > 0) {
        const normalizedPlanType = plan.planType?.toLowerCase();
        if (!coupon.applicablePlans.includes(normalizedPlanType)) {
          throw new ApiError(400, 'Coupon is not applicable to this plan');
        }
      }

      // Apply discount
      if (coupon.discountType === 'percentage') {
        discountAmount = (basePrice * coupon.discountValue) / 100;
      }
      
      appliedCoupon = {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
      };
    } else {
      throw new ApiError(404, 'Invalid coupon code');
    }
  }

  // Calculate discounted price after coupon
  const discountedPrice = Math.max(0, basePrice - discountAmount);
  
  // Calculate GST on discounted price
  const taxEnabled = plan.tax?.enabled;
  const taxPercentage = taxEnabled ? Number(plan.tax?.percentage ?? 18) : 0;
  const taxAmount = taxEnabled ? (discountedPrice * taxPercentage) / 100 : 0;
  
  // Final amount = discounted price + GST
  const finalAmount = discountedPrice + taxAmount;

  // Generate a short ref to help in bank statement search (not a security token)
  const ref = `SUB${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
  const note = purpose || `School ERP Subscription - ${plan.name} (${plan.billingCycle || 'monthly'}) - ${ref}`;

  const amount = finalAmount.toFixed(2);
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
  res.json({ 
    success: true, 
    qr: { dataUrl, upiUri, expiresInSeconds, amount: Number(amount) },
    pricing: {
      basePrice,
      discountAmount,
      discountedPrice,
      taxPercentage,
      taxAmount,
      finalAmount: Number(amount),
      appliedCoupon,
    },
  });
});

export const submitSubscriptionRequest = asyncHandler(async (req, res) => {
  const { planId, utr, mobileNumber, state, couponCode } = req.body;

  if (!planId || !mongoose.Types.ObjectId.isValid(planId)) throw new ApiError(400, 'planId is required');
  if (!utr) throw new ApiError(400, 'UPI Transaction ID / UTR is required');

  const [school, requestedPlan] = await Promise.all([
    School.findById(req.user.school).populate('plan'),
    Plan.findById(planId),
  ]);
  if (!school) throw new ApiError(400, 'School not found');
  if (!requestedPlan || !requestedPlan.isActive) throw new ApiError(404, 'Requested plan not found');

  // Check if there's already a pending request - only ONE pending request allowed at a time
  const existingPendingRequest = await SubscriptionRequest.findOne({
    school: school._id,
    status: 'pending',
  });
  if (existingPendingRequest) {
    throw new ApiError(400, 'You already have a pending subscription request. Please wait for it to be approved or rejected before submitting a new one.');
  }

  // Check if this is an upgrade (higher limits)
  const currentPlan = school.plan;
  const isUpgrade = currentPlan && (
    (requestedPlan.maxTeachers > currentPlan.maxTeachers) ||
    (requestedPlan.maxStudents > currentPlan.maxStudents) ||
    (requestedPlan.teacherCapacityType === 'unlimited' && currentPlan.teacherCapacityType !== 'unlimited') ||
    (requestedPlan.studentCapacityType === 'unlimited' && currentPlan.studentCapacityType !== 'unlimited')
  );

  const isDowngrade = currentPlan && (
    (requestedPlan.maxTeachers < currentPlan.maxTeachers) ||
    (requestedPlan.maxStudents < currentPlan.maxStudents) ||
    (requestedPlan.teacherCapacityType !== 'unlimited' && currentPlan.teacherCapacityType === 'unlimited') ||
    (requestedPlan.studentCapacityType !== 'unlimited' && currentPlan.studentCapacityType === 'unlimited')
  );

  // Handle coupon
  let couponId = null;
  let discountAmount = 0;
  
  if (couponCode && couponCode.trim()) {
    const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
    
    if (coupon) {
      // Validate coupon
      if (!coupon.isActive) throw new ApiError(400, 'Coupon is disabled');
      if (coupon.isExpired) throw new ApiError(400, 'Coupon has expired');
      if (coupon.isUsageLimitReached) throw new ApiError(400, 'Coupon usage limit reached');
      
      // Check applicability
      if (coupon.applicablePlans && coupon.applicablePlans.length > 0) {
        const normalizedPlanType = requestedPlan.planType?.toLowerCase();
        if (!coupon.applicablePlans.includes(normalizedPlanType)) {
          throw new ApiError(400, 'Coupon is not applicable to this plan');
        }
      }

      couponId = coupon._id;
      discountAmount = (Number(requestedPlan.finalPrice ?? requestedPlan.price ?? 0) * coupon.discountValue) / 100;
      
      // Increment coupon usage
      coupon.usedCount += 1;
      await coupon.save();
    }
  }

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
  
  // Calculate tax on discounted price
  const discountedPrice = Math.max(0, basePrice - discountAmount);
  const taxAmount = computedPricing.taxEnabled ? (discountedPrice * taxPercentage) / 100 : 0;
  const finalAmount = discountedPrice + taxAmount;

  // Calculate new expiry date
  const currentExpiry = school.planExpiresAt || new Date();
  const durationDays = requestedPlan.durationDays || 30;
  const newExpiry = new Date(currentExpiry);
  newExpiry.setDate(newExpiry.getDate() + durationDays);

  if (isUpgrade) {
    // Immediate activation for upgrades
    school.plan = requestedPlan._id;
    school.planExpiresAt = newExpiry;
    school.scheduledDowngradePlan = null;
    school.scheduledDowngradeDate = null;
    await school.save();

    // Create subscription history entry
    await SubscriptionHistory.create({
      school: school._id,
      plan: requestedPlan._id,
      action: 'plan_upgraded',
      previousPlan: currentPlan?._id,
      expiryDate: newExpiry,
    });

    // Notify admin about upgrade
    await Notification.create({
      title: 'Plan Upgraded Successfully',
      message: `Your plan has been upgraded to ${requestedPlan.name}. Valid until ${newExpiry.toLocaleDateString()}.`,
      priority: 'success',
      senderId: req.user._id,
      senderRole: 'school_admin',
      recipientIds: [req.user._id],
      schoolId: school._id,
      targetRole: 'school_admin',
      isBroadcast: false,
    });

    res.status(200).json({
      success: true,
      message: 'Plan upgraded successfully',
      subscription: {
        currentPlan: requestedPlan,
        planExpiresAt: newExpiry,
      },
    });
  } else if (isDowngrade) {
    // Schedule downgrade for end of current billing period
    school.scheduledDowngradePlan = requestedPlan._id;
    school.scheduledDowngradeDate = currentExpiry;
    await school.save();

    // Create subscription history entry
    await SubscriptionHistory.create({
      school: school._id,
      plan: requestedPlan._id,
      action: 'plan_downgrade_scheduled',
      previousPlan: currentPlan?._id,
      expiryDate: currentExpiry,
      scheduledDowngradeDate: currentExpiry,
    });

    // Notify admin about scheduled downgrade
    await Notification.create({
      title: 'Plan Downgrade Scheduled',
      message: `Your plan will be downgraded to ${requestedPlan.name} on ${currentExpiry.toLocaleDateString()}. Your current plan remains active until then.`,
      priority: 'info',
      senderId: req.user._id,
      senderRole: 'school_admin',
      recipientIds: [req.user._id],
      schoolId: school._id,
      targetRole: 'school_admin',
      isBroadcast: false,
    });

    res.status(200).json({
      success: true,
      message: 'Plan downgrade scheduled successfully',
      subscription: {
        currentPlan: currentPlan,
        planExpiresAt: currentExpiry,
        scheduledDowngradePlan: requestedPlan,
        scheduledDowngradeDate: currentExpiry,
      },
    });
  } else {
    // Pending approval for downgrades or new subscriptions
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
      couponId,
      couponCode: couponCode ? couponCode.trim().toUpperCase() : null,
      discountAmount,
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
        subscriptionRequestId: requestDoc._id,
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
  }
});

export const getSubscriptionStatus = asyncHandler(async (req, res) => {
  const school = await School.findById(req.user.school).populate('plan').populate('scheduledDowngradePlan');
  if (!school) throw new ApiError(404, 'School not found');

  console.log('[getSubscriptionStatus] School data:', {
    schoolId: school._id,
    plan: school.plan,
    planExpiresAt: school.planExpiresAt,
    isActive: school.isActive,
    scheduledDowngradePlan: school.scheduledDowngradePlan,
    scheduledDowngradeDate: school.scheduledDowngradeDate,
  });

  const pendingRequest = await SubscriptionRequest.findOne({
    school: school._id,
    status: 'pending',
  })
    .sort('-submittedAt -createdAt')
    .populate('requestedPlan', 'name planType billingCycle finalPrice');

  // Count current usage
  const [teacherCount, studentCount] = await Promise.all([
    User.countDocuments({ school: school._id, role: 'teacher', isActive: true }),
    Student.countDocuments({ school: school._id, isActive: true }),
  ]);

  const response = {
    success: true,
    subscription: {
      schoolId: school._id,
      currentPlan: school.plan,
      planExpiresAt: school.planExpiresAt,
      isActive: school.isActive,
      pendingRequest,
      scheduledDowngradePlan: school.scheduledDowngradePlan,
      scheduledDowngradeDate: school.scheduledDowngradeDate,
      usage: {
        teachers: teacherCount,
        students: studentCount,
        teacherLimit: school.plan?.teacherCapacityType === 'unlimited' ? null : school.plan?.maxTeachers || null,
        studentLimit: school.plan?.studentCapacityType === 'unlimited' ? null : school.plan?.maxStudents || null,
      },
    },
  };

  console.log('[getSubscriptionStatus] Response:', {
    currentPlan: response.subscription.currentPlan,
    planExpiresAt: response.subscription.planExpiresAt,
    scheduledDowngradePlan: response.subscription.scheduledDowngradePlan,
  });

  res.json(response);
});