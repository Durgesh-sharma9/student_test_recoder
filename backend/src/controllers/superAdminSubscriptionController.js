import mongoose from 'mongoose';
import PaymentSettings from '../models/PaymentSettings.js';
import SubscriptionRequest from '../models/SubscriptionRequest.js';
import School from '../models/School.js';
import Plan from '../models/Plan.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getPaymentSettings = asyncHandler(async (req, res) => {
  const settings = await PaymentSettings.findOne().sort('-updatedAt -createdAt');
  res.json({
    success: true,
    settings: settings || { upiId: '', merchantName: '', qrExpiryMinutes: 5 },
  });
});

export const updatePaymentSettings = asyncHandler(async (req, res) => {
  const { upiId, merchantName, qrExpiryMinutes } = req.body;
  if (!upiId) throw new ApiError(400, 'UPI ID is required');

  const updated = await PaymentSettings.findOneAndUpdate(
    {},
    {
      upiId: String(upiId).trim(),
      merchantName: String(merchantName || '').trim(),
      qrExpiryMinutes: Number(qrExpiryMinutes || 5),
      updatedBy: req.user._id,
    },
    { upsert: true, new: true, runValidators: true }
  );

  res.json({ success: true, settings: updated });
});

export const listSubscriptionRequests = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {};
  if (status) filter.status = status;

  if (search) {
    const q = new RegExp(String(search).trim(), 'i');
    const [schools, admins] = await Promise.all([
      School.find({ $or: [{ schoolName: q }, { email: q }, { adminName: q }] }).select('_id'),
      User.find({ role: 'school_admin', $or: [{ name: q }, { email: q }] }).select('_id'),
    ]);

    filter.$or = [
      { utr: q },
      { school: { $in: schools.map((s) => s._id) } },
      { adminUser: { $in: admins.map((a) => a._id) } },
    ];
  }

  const requests = await SubscriptionRequest.find(filter)
    .sort('-submittedAt -createdAt')
    .populate('school', 'schoolName adminName email phone plan planExpiresAt')
    .populate('adminUser', 'name email phoneNo')
    .populate('requestedPlan', 'name planType billingCycle basePrice tax finalPrice price')
    .populate('currentPlan', 'name planType billingCycle')
    .lean();

  res.json({ success: true, requests });
});

export const getSubscriptionRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid request id');

  const request = await SubscriptionRequest.findById(id)
    .populate('school', 'schoolName adminName email phone plan planExpiresAt')
    .populate('adminUser', 'name email phoneNo')
    .populate('requestedPlan', 'name planType billingCycle basePrice tax finalPrice price durationDays')
    .populate('currentPlan', 'name planType billingCycle')
    .populate('reviewedBy', 'name email');

  if (!request) throw new ApiError(404, 'Subscription request not found');
  res.json({ success: true, request });
});

export const approveSubscriptionRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid request id');

  const request = await SubscriptionRequest.findById(id).populate('school').populate('requestedPlan');
  if (!request) throw new ApiError(404, 'Subscription request not found');
  if (request.status !== 'pending') throw new ApiError(400, 'Only pending requests can be approved');

  const school = await School.findById(request.school._id);
  if (!school) throw new ApiError(404, 'School not found');

  const plan = await Plan.findById(request.requestedPlan._id);
  if (!plan || !plan.isActive) throw new ApiError(404, 'Requested plan not found');

  // Activate plan and extend expiry
  school.plan = plan._id;
  const now = new Date();
  const base = school.planExpiresAt && school.planExpiresAt > now ? school.planExpiresAt : now;
  school.planExpiresAt = new Date(base.getTime() + Number(plan.durationDays || 30) * 86400000);
  await school.save();

  request.status = 'approved';
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  await request.save();

  // Notify admin
  const admin = await User.findOne({ role: 'school_admin', school: school._id }).select('_id name email');
  if (admin) {
    const validTill = school.planExpiresAt ? new Date(school.planExpiresAt).toLocaleDateString('en-IN') : '';
    await Notification.create({
      title: 'Congratulations',
      message: `Your payment has been verified. Your ${plan.name} Plan has been activated successfully. Valid Till: ${validTill}`,
      priority: 'important',
      senderId: req.user._id,
      senderRole: 'super_admin',
      recipientIds: [admin._id],
      schoolId: school._id,
      targetRole: 'school_admin',
      isBroadcast: false,
    });
  }

  res.json({
    success: true,
    request: await SubscriptionRequest.findById(request._id)
      .populate('school', 'schoolName adminName email phone plan planExpiresAt')
      .populate('adminUser', 'name email phoneNo')
      .populate('requestedPlan', 'name planType billingCycle basePrice tax finalPrice price durationDays'),
  });
});

export const rejectSubscriptionRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, message } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid request id');
  if (!reason) throw new ApiError(400, 'Reject reason is required');

  const request = await SubscriptionRequest.findById(id).populate('school').populate('requestedPlan');
  if (!request) throw new ApiError(404, 'Subscription request not found');
  if (request.status !== 'pending') throw new ApiError(400, 'Only pending requests can be rejected');

  request.status = 'rejected';
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  request.rejectReason = reason;
  request.rejectMessage = message ? String(message).trim() : undefined;
  await request.save();

  const school = await School.findById(request.school._id);
  const admin = school ? await User.findOne({ role: 'school_admin', school: school._id }).select('_id') : null;

  if (admin) {
    const reasonLabel =
      reason === 'wrong_utr'
        ? 'Wrong UTR'
        : reason === 'wrong_amount'
          ? 'Wrong Amount'
          : reason === 'screenshot_missing'
            ? 'Screenshot Missing'
            : 'Other';

    await Notification.create({
      title: 'Payment Rejected',
      message: `Reason: ${reasonLabel}.${message ? ` ${String(message).trim()}` : ''} Please submit again.`,
      priority: 'important',
      senderId: req.user._id,
      senderRole: 'super_admin',
      recipientIds: [admin._id],
      schoolId: school?._id,
      targetRole: 'school_admin',
      isBroadcast: false,
    });
  }

  res.json({ success: true, request });
});

