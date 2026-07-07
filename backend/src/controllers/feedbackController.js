import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
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
    filter = { school: schoolId, teacherIds: user._id };
  } else if (user.role === 'parent') {
    filter = { $or: [{ parent: user._id }, { createdBy: user._id }] };
  } else {
    throw new ApiError(403, 'You do not have permission to view feedback.');
  }

  const tickets = await Feedback.find(filter).sort({ createdAt: -1 });

  res.json({ success: true, feedback: tickets });
});

export const createFeedback = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== 'parent') {
    throw new ApiError(403, 'Only parents can create feedback tickets.');
  }

  const { title, description, studentId, teacherIds } = req.body;
  if (!title || !description) {
    throw new ApiError(400, 'Title and description are required.');
  }

  let parsedTeacherIds = [];
  if (teacherIds) {
    try {
      parsedTeacherIds = typeof teacherIds === 'string' ? JSON.parse(teacherIds) : teacherIds;
    } catch {
      parsedTeacherIds = [];
    }
  }

  const attachments = await buildAttachmentData(req.files || []);

  const feedback = await Feedback.create({
    school: user.school,
    parent: user._id,
    student: studentId || undefined,
    teacherIds: parsedTeacherIds,
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
