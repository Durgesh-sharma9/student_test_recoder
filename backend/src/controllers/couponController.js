import mongoose from 'mongoose';
import Coupon from '../models/Coupon.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ success: true, coupons });
});

export const getCouponById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid coupon id');

  const coupon = await Coupon.findById(id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');

  res.json({ success: true, coupon });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const { code, discountValue, expiryDate, maxUses, unlimitedUses, applicablePlans, isActive } = req.body;

  if (!code || !code.trim()) throw new ApiError(400, 'Coupon code is required');
  if (discountValue === undefined || discountValue === null) throw new ApiError(400, 'Discount value is required');
  if (discountValue < 0 || discountValue > 100) throw new ApiError(400, 'Discount must be between 0 and 100');

  // Check if coupon code already exists
  const existingCoupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (existingCoupon) throw new ApiError(400, 'Coupon code already exists');

  const coupon = await Coupon.create({
    code: code.trim().toUpperCase(),
    discountType: 'percentage',
    discountValue: Number(discountValue),
    expiryDate: expiryDate ? new Date(expiryDate) : null,
    maxUses: unlimitedUses ? null : (maxUses ? Number(maxUses) : null),
    unlimitedUses: Boolean(unlimitedUses),
    applicablePlans: applicablePlans || [],
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  res.status(201).json({ success: true, coupon });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { code, discountValue, expiryDate, maxUses, unlimitedUses, applicablePlans, isActive } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid coupon id');

  const coupon = await Coupon.findById(id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');

  if (code && code.trim()) {
    // Check if new code conflicts with another coupon
    const existingCoupon = await Coupon.findOne({ code: code.trim().toUpperCase(), _id: { $ne: id } });
    if (existingCoupon) throw new ApiError(400, 'Coupon code already exists');
    coupon.code = code.trim().toUpperCase();
  }

  if (discountValue !== undefined && discountValue !== null) {
    if (discountValue < 0 || discountValue > 100) throw new ApiError(400, 'Discount must be between 0 and 100');
    coupon.discountValue = Number(discountValue);
  }

  if (expiryDate !== undefined) {
    coupon.expiryDate = expiryDate ? new Date(expiryDate) : null;
  }

  if (unlimitedUses !== undefined) {
    coupon.unlimitedUses = Boolean(unlimitedUses);
    if (unlimitedUses) {
      coupon.maxUses = null;
    }
  }

  if (maxUses !== undefined && !coupon.unlimitedUses) {
    coupon.maxUses = maxUses ? Number(maxUses) : null;
  }

  if (applicablePlans !== undefined) {
    coupon.applicablePlans = applicablePlans;
  }

  if (isActive !== undefined) {
    coupon.isActive = Boolean(isActive);
  }

  await coupon.save();

  res.json({ success: true, coupon });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid coupon id');

  const coupon = await Coupon.findById(id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');

  await Coupon.findByIdAndDelete(id);

  res.json({ success: true, message: 'Coupon deleted successfully' });
});

export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, planType } = req.body;

  if (!code || !code.trim()) throw new ApiError(400, 'Coupon code is required');

  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (!coupon) throw new ApiError(404, 'Invalid coupon');

  if (!coupon.isActive) throw new ApiError(400, 'Coupon is disabled');

  if (coupon.isExpired) throw new ApiError(400, 'Coupon has expired');

  if (coupon.isUsageLimitReached) throw new ApiError(400, 'Coupon usage limit reached');

  // Check if coupon is applicable to the plan type
  if (coupon.applicablePlans && coupon.applicablePlans.length > 0) {
    const normalizedPlanType = planType?.toLowerCase();
    if (!coupon.applicablePlans.includes(normalizedPlanType)) {
      throw new ApiError(400, 'Coupon is not applicable to this plan');
    }
  }

  res.json({
    success: true,
    coupon: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      isValid: coupon.isValid,
    },
  });
});

export const incrementCouponUsage = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code || !code.trim()) throw new ApiError(400, 'Coupon code is required');

  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (!coupon) throw new ApiError(404, 'Coupon not found');

  if (!coupon.unlimitedUses && coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    throw new ApiError(400, 'Coupon usage limit reached');
  }

  coupon.usedCount += 1;
  await coupon.save();

  res.json({ success: true, coupon });
});
