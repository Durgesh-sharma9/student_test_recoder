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

  console.log('=== GET FEEDBACK START ===');
  console.log('User role:', user.role);
  console.log('School ID:', schoolId);

  let filter = { school: schoolId };

  if (user.role === 'school_admin') {
    // Admin sees all feedback for their school
    filter = { school: schoolId };
  } else if (user.role === 'teacher') {
    // Teacher sees:
    // - Feedback they created
    // - Feedback where they are tagged
    // - Feedback addressed to them by admin
    filter = {
      school: schoolId,
      $or: [
        { createdBy: user._id },
        { teacherIds: user._id },
        { taggedTeacherId: user._id }
      ]
    };
  } else if (user.role === 'parent') {
    // Parent sees:
    // - Feedback they created
    // - Feedback where they are the parent (sent by teacher/admin)
    filter = {
      school: schoolId,
      $or: [
        { createdBy: user._id },
        { parent: user._id }
      ]
    };
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
    .populate('createdBy', 'name teacherName parentName adminName')
    .sort({ createdAt: -1 });

  console.log('Total tickets found:', tickets.length);
  tickets.forEach((ticket, idx) => {
    console.log(`Ticket ${idx} (${ticket.ticketId}):`, {
      hasAttachments: !!ticket.attachments,
      attachmentsCount: ticket.attachments?.length || 0,
      attachments: ticket.attachments,
      messagesCount: ticket.messages?.length || 0,
      firstMessageAttachments: ticket.messages[0]?.attachments,
      createdByRole: ticket.createdByRole
    });
  });
  console.log('=== GET FEEDBACK END ===');

  res.json({ success: true, feedback: tickets });
});

export const createFeedback = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!['parent', 'teacher', 'school_admin'].includes(user.role)) {
    throw new ApiError(403, 'You do not have permission to create feedback tickets.');
  }

  const { title, description, studentId, teacherId, recipientType, recipientTeacherId } = req.body;
  if (!title || !description) {
    throw new ApiError(400, 'Title and description are required.');
  }

  console.log('=== CREATE FEEDBACK START ===');
  console.log('User role:', user.role);
  console.log('req.files:', req.files);
  console.log('Number of files:', req.files?.length || 0);
  console.log('recipientType:', recipientType);
  console.log('recipientTeacherId:', recipientTeacherId);

  const attachments = await buildAttachmentData(req.files || []);

  console.log('Uploaded attachments:', attachments);
  console.log('Number of uploaded attachments:', attachments.length);

  let parent = null;
  let student = null;
  let teacherIds = [];
  let taggedTeacherId = null;
  let taggedTeacherName = null;
  let taggedSubject = null;

  // PARENT FLOW
  if (user.role === 'parent') {
    parent = user._id;
    student = studentId || undefined;
    teacherIds = teacherId ? [teacherId] : [];
    taggedTeacherId = teacherId || null;
    taggedSubject = taggedSubject || null;
    
    if (teacherId) {
      const teacher = await User.findById(teacherId).select('teacherName name');
      if (teacher) {
        taggedTeacherName = teacher.teacherName || teacher.name;
      }
    }
  }
  
  // TEACHER FLOW
  else if (user.role === 'teacher') {
    // Teacher must select a student, parent is auto-determined
    if (!studentId) {
      throw new ApiError(400, 'Student is required for teacher feedback.');
    }
    
    const Student = (await import('../models/Student.js')).default;
    const studentDoc = await Student.findById(studentId).populate('parent');
    if (!studentDoc) {
      throw new ApiError(404, 'Student not found.');
    }
    
    parent = studentDoc.parent;
    student = studentId;
    teacherIds = [user._id]; // Teacher is tagged by default
    taggedTeacherId = user._id;
    taggedTeacherName = user.teacherName || user.name;
    taggedSubject = taggedSubject || null;
    
    // Teacher can optionally tag another teacher
    if (recipientTeacherId && String(recipientTeacherId) !== String(user._id)) {
      teacherIds.push(recipientTeacherId);
    }
  }
  
  // ADMIN FLOW
  else if (user.role === 'school_admin') {
    if (!recipientType) {
      throw new ApiError(400, 'Recipient type is required.');
    }
    
    if (recipientType === 'parent' || recipientType === 'both') {
      if (!studentId) {
        throw new ApiError(400, 'Student is required when sending to parent.');
      }
      
      const Student = (await import('../models/Student.js')).default;
      const studentDoc = await Student.findById(studentId).populate('parent');
      if (!studentDoc) {
        throw new ApiError(404, 'Student not found.');
      }
      
      parent = studentDoc.parent;
      student = studentId;
    }
    
    if (recipientType === 'teacher' || recipientType === 'both') {
      if (recipientTeacherId) {
        teacherIds = [recipientTeacherId];
        taggedTeacherId = recipientTeacherId;
        const teacher = await User.findById(recipientTeacherId).select('teacherName name');
        if (teacher) {
          taggedTeacherName = teacher.teacherName || teacher.name;
        }
      }
    }
  }

  const feedback = await Feedback.create({
    school: user.school,
    parent,
    student,
    teacherIds,
    taggedTeacherId,
    taggedTeacherName,
    taggedSubject,
    createdBy: user._id,
    createdByRole: user.role,
    title,
    description,
    ticketId: generateTicketId(),
    attachments,
    messages: [
      {
        senderRole: user.role === 'school_admin' ? 'school_admin' : user.role,
        senderId: user._id,
        senderName: user.name || user.teacherName || user.parentName || user.adminName || 'User',
        content: description,
        attachments,
      },
    ],
  });

  console.log('Feedback created with attachments:', feedback.attachments);
  console.log('Feedback messages attachments:', feedback.messages[0].attachments);
  console.log('=== CREATE FEEDBACK END ===');

  // NOTIFICATIONS
  const adminUsers = await User.find({ role: 'school_admin', school: user.school, isActive: true }).select('_id');
  const adminIds = adminUsers.map(admin => admin._id);

  // Always notify admins (unless admin is the creator)
  if (adminIds.length > 0 && user.role !== 'school_admin') {
    await Notification.create({
      title: `New Feedback: ${title}`,
      message: `${user.role === 'parent' ? 'Parent' : user.role === 'teacher' ? 'Teacher' : 'Admin'} submitted feedback: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
      priority: 'important',
      senderId: user._id,
      senderRole: user.role,
      recipientIds: adminIds,
      schoolId: user.school,
      targetRole: 'school_admin',
      isBroadcast: true,
      type: 'feedback',
      feedbackId: feedback._id,
    });
  }

  // Notify parent if teacher or admin created
  if (parent && user.role !== 'parent') {
    await Notification.create({
      title: `New Feedback: ${title}`,
      message: `${user.role === 'teacher' ? 'Teacher' : 'Admin'} sent you feedback: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
      priority: 'important',
      senderId: user._id,
      senderRole: user.role,
      recipientIds: [parent],
      schoolId: user.school,
      targetRole: 'parent',
      isBroadcast: false,
      type: 'feedback',
      feedbackId: feedback._id,
    });
  }

  // Notify tagged teachers
  if (teacherIds.length > 0) {
    const recipients = user.role === 'teacher' 
      ? teacherIds.filter(id => String(id) !== String(user._id)) // Don't notify self
      : teacherIds;
    
    if (recipients.length > 0) {
      await Notification.create({
        title: `New Feedback: ${title}`,
        message: `${user.role === 'parent' ? 'Parent' : user.role === 'teacher' ? 'Teacher' : 'Admin'} ${user.role === 'parent' ? 'tagged you in' : 'sent you'} feedback: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
        priority: 'important',
        senderId: user._id,
        senderRole: user.role,
        recipientIds: recipients,
        schoolId: user.school,
        targetRole: 'teacher',
        isBroadcast: true,
        type: 'feedback',
        feedbackId: feedback._id,
      });
    }
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
