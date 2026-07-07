import Poll from '../models/Poll.js';
import PollResponse from '../models/PollResponse.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Parent from '../models/Parent.js';
import Student from '../models/Student.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadFile } from '../utils/imagekit.js';
import mongoose from 'mongoose';

const determineStatus = (poll) => {
  if (poll.status === 'draft') return 'Draft';
  if (poll.status === 'closed') return 'Closed';
  if (poll.expiryDate && new Date(poll.expiryDate) < new Date()) return 'Expired';
  return 'Active';
};

const normalizeOptions = (rawOptions) => {
  if (Array.isArray(rawOptions)) {
    return rawOptions
      .map((option, index) => ({ text: String(option?.text || option || '').trim(), order: index }))
      .filter((option) => option.text);
  }

  if (typeof rawOptions === 'string') {
    try {
      const parsed = JSON.parse(rawOptions);
      return Array.isArray(parsed)
        ? parsed.map((option, index) => ({ text: String(option?.text || option || '').trim(), order: index })).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  }

  return [];
};

export const getPolls = asyncHandler(async (req, res) => {
  const user = req.user;
  const schoolId = user.school;

  let filter = { school: schoolId };

  if (user.role === 'school_admin') {
    filter = { school: schoolId };
  } else if (user.role === 'teacher' || user.role === 'parent') {
    const visibleNotifications = await Notification.find({
      schoolId,
      pollId: { $exists: true },
      recipientIds: user._id,
    }).select('pollId');
    const pollIds = visibleNotifications.map((item) => item.pollId);
    filter = { _id: { $in: pollIds }, school: schoolId };
  } else {
    throw new ApiError(403, 'You do not have permission to view polls.');
  }

  const polls = await Poll.find(filter).sort({ createdAt: -1 });

  const pollsWithStats = await Promise.all(
    polls.map(async (poll) => {
      const totalResponses = await PollResponse.countDocuments({ poll: poll._id });
      const optionCounts = await PollResponse.aggregate([
        { $match: { poll: poll._id } },
        { $unwind: '$selectedOptionIndexes' },
        { $group: { _id: '$selectedOptionIndexes', count: { $sum: 1 } } },
      ]);

      return {
        ...poll.toObject(),
        status: determineStatus(poll),
        totalResponses,
        optionCounts,
      };
    })
  );

  res.json({ success: true, polls: pollsWithStats });
});

export const getPollById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid poll ID');
  }

  const poll = await Poll.findById(id);
  if (!poll) throw new ApiError(404, 'Poll not found.');

  if (user.role === 'school_admin') {
    if (String(poll.school) !== String(user.school)) {
      throw new ApiError(403, 'You do not have permission to view this poll.');
    }
  } else if (user.role === 'teacher' || user.role === 'parent') {
    const notification = await Notification.findOne({
      pollId: poll._id,
      recipientIds: user._id,
      schoolId: user.school,
    });
    if (!notification) {
      throw new ApiError(403, 'You do not have permission to view this poll.');
    }
  } else {
    throw new ApiError(403, 'You do not have permission to view this poll.');
  }

  const existingResponse = await PollResponse.findOne({ poll: poll._id, user: user._id });
  const totalResponses = await PollResponse.countDocuments({ poll: poll._id });
  const optionCounts = await PollResponse.aggregate([
    { $match: { poll: poll._id } },
    { $unwind: '$selectedOptionIndexes' },
    { $group: { _id: '$selectedOptionIndexes', count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    poll: {
      ...poll.toObject(),
      status: determineStatus(poll),
      totalResponses,
      optionCounts,
      existingResponse,
    },
  });
});

export const createPoll = asyncHandler(async (req, res) => {
  const user = req.user;
  const schoolId = user.school;
  const role = user.role;

  if (role !== 'school_admin') {
    throw new ApiError(403, 'Only school admins can create polls.');
  }

  const { title, description, audience, audienceScope, pollType, allowEdit, expiryDate, selectedClassIds, options } = req.body;
  const normalizedOptions = normalizeOptions(options);

  if (!title || !description) {
    throw new ApiError(400, 'Title and description are required.');
  }

  if (normalizedOptions.length < 2) {
    throw new ApiError(400, 'At least two poll options are required.');
  }

  if (!['teachers', 'parents'].includes(audience)) {
    throw new ApiError(400, 'Audience must be teachers or parents.');
  }

  const selectedClassList = Array.isArray(selectedClassIds)
    ? selectedClassIds
    : typeof selectedClassIds === 'string'
      ? JSON.parse(selectedClassIds)
      : [];

  if (audience === 'parents' && audienceScope === 'selected_classes' && selectedClassList.length === 0) {
    throw new ApiError(400, 'Please select at least one class for targeted parent polls.');
  }

  let recipientIds = [];

  if (audience === 'teachers') {
    const teachers = await User.find({ role: 'teacher', school: schoolId, isActive: true }).select('_id');
    recipientIds = teachers.map((teacher) => teacher._id);
  } else {
    let parentCandidates = [];
    if (audienceScope === 'all') {
      parentCandidates = await Parent.find({ school: schoolId, status: 'Active' }).select('_id');
    } else {
      const students = await Student.find({
        school: schoolId,
        class: { $in: selectedClassList },
        isActive: true,
      }).select('parent');
      const parentIds = students.map((student) => student.parent).filter(Boolean);
      parentCandidates = await Parent.find({ _id: { $in: parentIds }, school: schoolId, status: 'Active' }).select('_id');
    }
    recipientIds = parentCandidates.map((parent) => parent._id);
  }

  let attachmentUrl = null;
  let attachmentName = null;
  let attachmentType = null;

  if (req.file) {
    try {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new ApiError(400, 'Invalid file type. Allowed types: PDF, DOC, DOCX, XLSX, CSV, JPG, JPEG, PNG');
      }
      const uploadResult = await uploadFile(req.file, req.file.originalname, 'polls');
      attachmentUrl = uploadResult.url;
      attachmentName = req.file.originalname;
      attachmentType = req.file.mimetype;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to upload attachment');
    }
  }

  const poll = await Poll.create({
    school: schoolId,
    createdBy: user._id,
    title,
    description,
    audience,
    audienceScope: audience === 'parents' ? audienceScope || 'all' : 'all',
    selectedClassIds: selectedClassList,
    pollType: pollType === 'multiple' ? 'multiple' : 'single',
    options: normalizedOptions,
    allowEdit: Boolean(allowEdit),
    expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    status: 'active',
    recipientCount: recipientIds.length,
    publishedAt: new Date(),
    attachmentUrl,
    attachmentName,
    attachmentType,
  });

  if (recipientIds.length > 0) {
    await Notification.create({
      title: `Poll: ${title}`,
      message: description,
      priority: 'info',
      senderId: user._id,
      senderRole: role,
      recipientIds,
      schoolId,
      targetRole: audience === 'teachers' ? 'teacher' : 'parent',
      isBroadcast: true,
      type: 'poll',
      pollId: poll._id,
      attachmentUrl,
      attachmentName,
      attachmentType,
    });
  }

  res.status(201).json({ success: true, poll });
});

export const respondToPoll = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid poll ID');
  }

  const poll = await Poll.findById(id);
  if (!poll) throw new ApiError(404, 'Poll not found.');

  if (poll.status === 'draft' || poll.status === 'closed') {
    throw new ApiError(400, 'This poll is no longer accepting responses.');
  }

  if (poll.expiryDate && new Date(poll.expiryDate) < new Date()) {
    throw new ApiError(400, 'This poll has expired.');
  }

  const existingResponse = await PollResponse.findOne({ poll: poll._id, user: user._id });
  const selectedOptionIndexes = Array.isArray(req.body.selectedOptionIndexes)
    ? req.body.selectedOptionIndexes.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 0)
    : [];

  if (selectedOptionIndexes.length === 0) {
    throw new ApiError(400, 'Please select at least one option.');
  }

  const uniqueIndexes = [...new Set(selectedOptionIndexes)].sort((a, b) => a - b);
  if (poll.pollType === 'single' && uniqueIndexes.length !== 1) {
    throw new ApiError(400, 'Single choice polls allow one selection only.');
  }

  if (uniqueIndexes.some((index) => index >= poll.options.length)) {
    throw new ApiError(400, 'One or more selected options are invalid.');
  }

  if (existingResponse && !poll.allowEdit) {
    throw new ApiError(400, 'You have already submitted a response for this poll.');
  }

  if (existingResponse) {
    existingResponse.selectedOptionIndexes = uniqueIndexes;
    existingResponse.submittedAt = new Date();
    await existingResponse.save();
    return res.json({ success: true, message: 'Your response has been updated.', response: existingResponse });
  }

  const response = await PollResponse.create({
    poll: poll._id,
    user: user._id,
    userModel: user.role === 'parent' ? 'Parent' : 'User',
    selectedOptionIndexes: uniqueIndexes,
  });

  res.status(201).json({ success: true, message: 'Your response has been submitted.', response });
});
