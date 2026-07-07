import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Parent from '../models/Parent.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadFile } from '../utils/imagekit.js';

const generateTicketId = () => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `FB-${stamp}-${random}`;
};

const buildAttachmentData = async (files = []) => {
  if (!files || files.length === 0) return [];

  const uploaded = [];
  for (const file of files) {
    const uploadResult = await uploadFile(file, file.originalname, 'feedback');
    uploaded.push({
      url: uploadResult.url,
      name: file.originalname,
      type: file.mimetype,
    });
  }
  return uploaded;
};

const canAccessFeedback = (feedback, user) => {
  if (user.role === 'school_admin') {
    return String(feedback.school) === String(user.school);
  }

  if (user.role === 'teacher') {
    return feedback.teacherIds.some((teacherId) => String(teacherId) === String(user._id));
  }

  if (user.role === 'parent') {
    return String(feedback.parent) === String(user._id) || String(feedback.createdBy) === String(user._id);
  }

  return false;
};

export const getFeedback = asyncHandler(async (req, res) => {
  const user = req.user;
  const schoolId = user.school;

  let filter = {};

  if (user.role === 'school_admin') {
    filter = { school: schoolId };
  } else if (user.role === 'teacher') {
    filter = { school: schoolId, $or: [{ teacherIds: user._id }, { taggedTeacherId: user._id }] };
  } else if (user.role === 'parent') {
    filter = { $or: [{ parent: user._id }, { createdBy: user._id }] };
  } else {
    throw new ApiError(403, 'You do not have permission to view feedback.');
  }

  const tickets = await Feedback.find(filter)
    .populate('parent', 'parentName email phone')
    .populate('student', 'name rollNo class')
    .populate({
      path: 'student',
      populate: {
        path: 'class',
        select: 'className section'
      }
    })
    .populate('teacherIds', 'teacherName name email')
    .sort({ createdAt: -1 });

  res.json({ success: true, feedback: tickets });
});

export const createFeedback = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== 'parent') {
    throw new ApiError(403, 'Only parents can create feedback tickets.');
  }

  const { title, description, studentId, teacherId, taggedSubject } = req.body;
  if (!title || !description) {
    throw new ApiError(400, 'Title and description are required.');
  }

  const attachments = await buildAttachmentData(req.files || []);

  // Fetch teacher name if teacher is tagged
  let taggedTeacherName = null;
  if (teacherId) {
    const teacher = await User.findById(teacherId).select('teacherName name');
    if (teacher) {
      taggedTeacherName = teacher.teacherName || teacher.name;
    }
  }

  const feedback = await Feedback.create({
    school: user.school,
    parent: user._id,
    student: studentId || undefined,
    teacherIds: teacherId ? [teacherId] : [],
    taggedTeacherId: teacherId || null,
    taggedTeacherName: taggedTeacherName,
    taggedSubject: taggedSubject || null,
    createdBy: user._id,
    title,
    description,
    ticketId: generateTicketId(),
    attachments,
    messages: [
      {
        senderRole: 'parent',
        senderId: user._id,
        senderName: user.name || user.parentName || 'Parent',
        content: description,
        attachments,
      },
    ],
  });

  // Send notification to school admin
  const adminUsers = await User.find({ role: 'school_admin', school: user.school, isActive: true }).select('_id');
  const adminIds = adminUsers.map(admin => admin._id);

  if (adminIds.length > 0) {
    await Notification.create({
      title: `New Feedback: ${title}`,
      message: `Parent submitted feedback: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
      priority: 'important',
      senderId: user._id,
      senderRole: 'parent',
      recipientIds: adminIds,
      schoolId: user.school,
      targetRole: 'school_admin',
      isBroadcast: true,
      type: 'feedback',
      feedbackId: feedback._id,
    });
  }

  // Send notification to tagged teacher
  if (teacherId) {
    await Notification.create({
      title: `New Feedback: ${title}`,
      message: `Parent tagged you in feedback: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
      priority: 'important',
      senderId: user._id,
      senderRole: 'parent',
      recipientIds: [teacherId],
      schoolId: user.school,
      targetRole: 'teacher',
      isBroadcast: true,
      type: 'feedback',
      feedbackId: feedback._id,
    });
  }

  res.status(201).json({ success: true, feedback });
});

export const replyToFeedback = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid feedback ID.');
  }

  const feedback = await Feedback.findById(id);
  if (!feedback) {
    throw new ApiError(404, 'Feedback ticket not found.');
  }

  if (!canAccessFeedback(feedback, user)) {
    throw new ApiError(403, 'You do not have permission to reply to this feedback.');
  }

  if (!content?.trim() && (!req.files || req.files.length === 0)) {
    throw new ApiError(400, 'Reply message or attachment is required.');
  }

  const attachments = await buildAttachmentData(req.files || []);

  feedback.messages.push({
    senderRole: user.role === 'parent' ? 'parent' : user.role === 'teacher' ? 'teacher' : 'school_admin',
    senderId: user._id,
    senderName: user.name || user.teacherName || user.parentName || 'User',
    content: content?.trim() || '',
    attachments,
  });
  feedback.lastReplyAt = new Date();
  await feedback.save();

  // Send notification to parent when admin or teacher replies
  if (user.role !== 'parent') {
    const parentDoc = await Parent.findById(feedback.parent).select('_id');
    if (parentDoc) {
      await Notification.create({
        title: `Feedback Reply: ${feedback.title}`,
        message: `${user.name || user.teacherName || 'Admin'} replied to your feedback: ${content?.substring(0, 100) || 'Attachment'}${content?.length > 100 ? '...' : ''}`,
        priority: 'info',
        senderId: user._id,
        senderRole: user.role === 'teacher' ? 'teacher' : 'school_admin',
        recipientIds: [parentDoc._id],
        schoolId: feedback.school,
        targetRole: 'parent',
        isBroadcast: false,
        type: 'feedback',
        feedbackId: feedback._id,
      });
    }
  }

  // Send notification to admin when parent replies
  if (user.role === 'parent') {
    const adminUsers = await User.find({ role: 'school_admin', school: feedback.school, isActive: true }).select('_id');
    const adminIds = adminUsers.map(admin => admin._id);

    if (adminIds.length > 0) {
      await Notification.create({
        title: `Feedback Reply: ${feedback.title}`,
        message: `Parent replied to feedback: ${content?.substring(0, 100) || 'Attachment'}${content?.length > 100 ? '...' : ''}`,
        priority: 'info',
        senderId: user._id,
        senderRole: 'parent',
        recipientIds: adminIds,
        schoolId: feedback.school,
        targetRole: 'school_admin',
        isBroadcast: true,
        type: 'feedback',
        feedbackId: feedback._id,
      });
    }
  }

  // Send notification to tagged teachers when parent replies
  if (user.role === 'parent' && feedback.teacherIds && feedback.teacherIds.length > 0) {
    await Notification.create({
      title: `Feedback Reply: ${feedback.title}`,
      message: `Parent replied to feedback: ${content?.substring(0, 100) || 'Attachment'}${content?.length > 100 ? '...' : ''}`,
      priority: 'info',
      senderId: user._id,
      senderRole: 'parent',
      recipientIds: feedback.teacherIds,
      schoolId: feedback.school,
      targetRole: 'teacher',
      isBroadcast: true,
      type: 'feedback',
      feedbackId: feedback._id,
    });
  }

  res.json({ success: true, feedback });
});

export const updateFeedbackStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const user = req.user;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid feedback ID.');
  }

  const feedback = await Feedback.findById(id);
  if (!feedback) {
    throw new ApiError(404, 'Feedback ticket not found.');
  }

  if (!canAccessFeedback(feedback, user)) {
    throw new ApiError(403, 'You do not have permission to update this feedback.');
  }

  if (!['Open', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
    throw new ApiError(400, 'Invalid status.');
  }

  feedback.status = status;
  await feedback.save();

  res.json({ success: true, feedback });
});
