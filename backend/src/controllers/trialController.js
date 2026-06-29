import mongoose from 'mongoose';
import School from '../models/School.js';
import User from '../models/User.js';
import TrialRequest from '../models/TrialRequest.js';
import Notification from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const submitTrialRequest = asyncHandler(async (req, res) => {
  const { instituteName, contactNumber, email, expectedStudents, expectedTeachers, reason } = req.body;

  if (!instituteName || !contactNumber || !email || !expectedStudents || !expectedTeachers || !reason) {
    throw new ApiError(400, 'All fields are required');
  }

  const school = await School.findById(req.user.school);
  if (!school) throw new ApiError(404, 'School not found');

  const requestDoc = await TrialRequest.create({
    school: school._id,
    adminUser: req.user._id,
    instituteName,
    contactNumber,
    email,
    expectedStudents: Number(expectedStudents),
    expectedTeachers: Number(expectedTeachers),
    reason,
    status: 'pending',
    submittedAt: new Date(),
  });

  // Notify super admins about new trial request
  const superAdmins = await User.find({ role: 'super_admin', isActive: true }).select('_id');
  if (superAdmins.length) {
    await Notification.create({
      title: 'New trial request submitted',
      message: `${school.schoolName} has requested a 7-day trial for ${expectedStudents} students and ${expectedTeachers} teachers.`,
      priority: 'normal',
      senderId: req.user._id,
      senderRole: 'school_admin',
      recipientIds: superAdmins.map((u) => u._id),
      schoolId: school._id,
      targetRole: 'school_admin',
      isBroadcast: false,
      trialRequestId: requestDoc._id,
    });
  }

  // Notify admin about submission
  await Notification.create({
    title: 'Trial Request Submitted',
    message: 'Your trial request has been received. Our team will review and get back to you within 24 hours.',
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
    request: await TrialRequest.findById(requestDoc._id)
      .populate('school', 'schoolName email')
      .populate('adminUser', 'name'),
  });
});

export const getTrialRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const requests = await TrialRequest.find(filter)
    .sort('-submittedAt')
    .populate('school', 'schoolName email')
    .populate('adminUser', 'name')
    .populate('trialPlan', 'name');

  res.json({ success: true, requests });
});

export const approveTrialRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { trialPlanId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid request id');
  if (!trialPlanId || !mongoose.Types.ObjectId.isValid(trialPlanId)) throw new ApiError(400, 'trialPlanId is required');

  const request = await TrialRequest.findById(id);
  if (!request) throw new ApiError(404, 'Trial request not found');
  if (request.status !== 'pending') throw new ApiError(400, 'Request is not pending');

  const Plan = (await import('../models/Plan.js')).default;
  const trialPlan = await Plan.findById(trialPlanId);
  if (!trialPlan) throw new ApiError(404, 'Trial plan not found');

  const trialStartsAt = new Date();
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  request.status = 'approved';
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  request.trialPlan = trialPlanId;
  request.trialStartsAt = trialStartsAt;
  request.trialEndsAt = trialEndsAt;
  await request.save();

  // Update school with trial plan
  const School = (await import('../models/School.js')).default;
  await School.findByIdAndUpdate(request.school, {
    plan: trialPlanId,
    planExpiresAt: trialEndsAt,
    isActive: true,
  });

  // Notify school admin
  await Notification.create({
    title: 'Trial Request Approved',
    message: `Your 7-day trial has been approved. Your trial expires on ${trialEndsAt.toLocaleDateString()}.`,
    priority: 'important',
    senderId: req.user._id,
    senderRole: 'super_admin',
    recipientIds: [request.adminUser],
    schoolId: request.school,
    targetRole: 'school_admin',
    isBroadcast: false,
    trialRequestId: request._id,
  });

  res.json({ success: true, request: await TrialRequest.findById(id).populate('trialPlan', 'name') });
});

export const rejectTrialRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectMessage } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid request id');

  const request = await TrialRequest.findById(id);
  if (!request) throw new ApiError(404, 'Trial request not found');
  if (request.status !== 'pending') throw new ApiError(400, 'Request is not pending');

  request.status = 'rejected';
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  request.rejectMessage = rejectMessage;
  await request.save();

  // Notify school admin
  await Notification.create({
    title: 'Trial Request Rejected',
    message: rejectMessage || 'Your trial request could not be approved at this time. Please contact support for more information.',
    priority: 'normal',
    senderId: req.user._id,
    senderRole: 'super_admin',
    recipientIds: [request.adminUser],
    schoolId: request.school,
    targetRole: 'school_admin',
    isBroadcast: false,
    trialRequestId: request._id,
  });

  res.json({ success: true, request });
});
