import mongoose from 'mongoose';
import School from '../models/School.js';
import User from '../models/User.js';
import EnterpriseRequest from '../models/EnterpriseRequest.js';
import Notification from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const submitEnterpriseRequest = asyncHandler(async (req, res) => {
  const { instituteName, contactNumber, email, requiredStudents, requiredTeachers, additionalRequirements } = req.body;

  if (!instituteName || !contactNumber || !email || !requiredStudents || !requiredTeachers) {
    throw new ApiError(400, 'Required fields are missing');
  }

  const school = await School.findById(req.user.school);
  if (!school) throw new ApiError(404, 'School not found');

  const requestDoc = await EnterpriseRequest.create({
    school: school._id,
    adminUser: req.user._id,
    instituteName,
    contactNumber,
    email,
    requiredStudents: Number(requiredStudents),
    requiredTeachers: Number(requiredTeachers),
    additionalRequirements: additionalRequirements || '',
    status: 'pending',
    submittedAt: new Date(),
  });

  // Notify super admins about new enterprise request
  const superAdmins = await User.find({ role: 'super_admin', isActive: true }).select('_id');
  if (superAdmins.length) {
    await Notification.create({
      title: 'New enterprise request submitted',
      message: `${school.schoolName} has requested an enterprise plan for ${requiredStudents} students and ${requiredTeachers} teachers.`,
      priority: 'important',
      senderId: req.user._id,
      senderRole: 'school_admin',
      recipientIds: superAdmins.map((u) => u._id),
      schoolId: school._id,
      targetRole: 'school_admin',
      isBroadcast: false,
      enterpriseRequestId: requestDoc._id,
    });
  }

  // Notify admin about submission
  await Notification.create({
    title: 'Enterprise Request Submitted',
    message: 'Your enterprise plan request has been received. Our team will contact you within 24 hours to discuss pricing.',
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
    request: await EnterpriseRequest.findById(requestDoc._id)
      .populate('school', 'schoolName email')
      .populate('adminUser', 'name'),
  });
});

export const getEnterpriseRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const requests = await EnterpriseRequest.find(filter)
    .sort('-submittedAt')
    .populate('school', 'schoolName email')
    .populate('adminUser', 'name')
    .populate('customPlan', 'name');

  res.json({ success: true, requests });
});

export const updateEnterpriseStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, quotedPrice, notes, customPlanId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid request id');

  const validStatuses = ['pending', 'contacted', 'quoted', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) throw new ApiError(400, 'Invalid status');

  const request = await EnterpriseRequest.findById(id);
  if (!request) throw new ApiError(404, 'Enterprise request not found');

  request.status = status;
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();

  if (quotedPrice !== undefined) request.quotedPrice = Number(quotedPrice);
  if (notes) request.notes = notes;
  if (customPlanId && mongoose.Types.ObjectId.isValid(customPlanId)) {
    request.customPlan = customPlanId;
  }

  await request.save();

  // Notify school admin about status change
  let notificationTitle = 'Enterprise Request Updated';
  let notificationMessage = `Your enterprise request status has been updated to: ${status}`;

  if (status === 'quoted') {
    notificationTitle = 'Enterprise Quote Ready';
    notificationMessage = notes || 'Your enterprise plan quote is ready. Our team will contact you shortly.';
  } else if (status === 'approved') {
    notificationTitle = 'Enterprise Plan Approved';
    notificationMessage = 'Your enterprise plan has been approved. Please proceed with payment to activate your subscription.';
  } else if (status === 'rejected') {
    notificationTitle = 'Enterprise Request Rejected';
    notificationMessage = notes || 'Your enterprise request could not be approved at this time.';
  }

  await Notification.create({
    title: notificationTitle,
    message: notificationMessage,
    priority: status === 'quoted' || status === 'approved' ? 'important' : 'normal',
    senderId: req.user._id,
    senderRole: 'super_admin',
    recipientIds: [request.adminUser],
    schoolId: request.school,
    targetRole: 'school_admin',
    isBroadcast: false,
    enterpriseRequestId: request._id,
  });

  res.json({ success: true, request: await EnterpriseRequest.findById(id).populate('customPlan', 'name') });
});
