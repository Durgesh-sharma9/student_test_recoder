import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { withSchool } from '../utils/tenantQuery.js';
import { uploadFile } from '../utils/imagekit.js';
import mongoose from 'mongoose';

// Get notifications for current user
export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const schoolId = req.user.school;

  let filter = {};

  if (role === 'teacher') {
    // Teachers can only see notifications sent to them
    filter = {
      recipientIds: userId,
      schoolId,
    };
  } else if (role === 'school_admin') {
    // Admins can see notifications sent to them and notifications they sent
    filter = {
      $or: [
        { recipientIds: userId, schoolId },
        { senderId: userId, schoolId },
      ],
    };
  } else if (role === 'super_admin') {
    // Super admins can see notifications they sent
    filter = {
      senderId: userId,
    };
  }

  const notifications = await Notification.find(filter)
    .populate('senderId', 'name email')
    .populate('recipientIds', 'name email')
    .sort({ createdAt: -1 });

  const unreadCount = await Notification.countDocuments({
    ...filter,
    recipientIds: userId,
    readBy: { $ne: userId },
  });

  res.json({
    success: true,
    count: notifications.length,
    unreadCount,
    notifications,
  });
});

// Get notification by ID
export const getNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid notification ID');
  }

  const notification = await Notification.findById(id)
    .populate('senderId', 'name email')
    .populate('recipientIds', 'name email');

  if (!notification) throw new ApiError(404, 'Notification not found.');

  // Check if user has permission to view this notification
  const userId = req.user._id;
  const role = req.user.role;

  if (role === 'teacher') {
    if (!notification.recipientIds.some((r) => r._id.toString() === userId.toString())) {
      throw new ApiError(403, 'You do not have permission to view this notification.');
    }
  } else if (role === 'school_admin') {
    if (
      !notification.recipientIds.some((r) => r._id.toString() === userId.toString()) &&
      notification.senderId._id.toString() !== userId.toString()
    ) {
      throw new ApiError(403, 'You do not have permission to view this notification.');
    }
  } else if (role === 'super_admin') {
    if (notification.senderId._id.toString() !== userId.toString()) {
      throw new ApiError(403, 'You do not have permission to view this notification.');
    }
  }

  res.json({
    success: true,
    notification,
  });
});

// Create notification
export const createNotification = asyncHandler(async (req, res) => {
  const { title, message, priority, recipientIds, targetRole, isBroadcast } = req.body;
  const userId = req.user._id;
  const role = req.user.role;
  const schoolId = req.user.school;

  if (!title || !message) {
    throw new ApiError(400, 'Title and message are required.');
  }

  // Handle file upload if attachment is present
  let attachmentUrl = null;
  let attachmentName = null;
  let attachmentType = null;

  if (req.file) {
    try {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'image/jpeg', 'image/jpg', 'image/png'];
      
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new ApiError(400, 'Invalid file type. Allowed types: PDF, DOC, DOCX, XLSX, CSV, JPG, JPEG, PNG');
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (req.file.size > maxSize) {
        throw new ApiError(400, 'File size exceeds 10MB limit');
      }

      const uploadResult = await uploadFile(req.file, req.file.originalname, 'notifications');
      attachmentUrl = uploadResult.url;
      attachmentName = req.file.originalname;
      attachmentType = req.file.mimetype;
    } catch (error) {
      console.error('File upload error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to upload attachment');
    }
  }

  // Validate recipients based on role
  let finalRecipientIds = recipientIds || [];

  if (role === 'super_admin') {
    // Super admin can only send to school admins
    if (isBroadcast) {
      const admins = await User.find({ role: 'school_admin' });
      finalRecipientIds = admins.map((a) => a._id);
    } else {
      if (!recipientIds || recipientIds.length === 0) {
        throw new ApiError(400, 'At least one recipient is required.');
      }
      const recipients = await User.find({
        _id: { $in: recipientIds },
        role: 'school_admin',
      });
      if (recipients.length !== recipientIds.length) {
        throw new ApiError(400, 'Super admin can only send notifications to school admins.');
      }
      finalRecipientIds = recipientIds;
    }
  } else if (role === 'school_admin') {
    // School admin can only send to teachers of their school
    if (isBroadcast) {
      const teachers = await User.find({ role: 'teacher', school: schoolId });
      finalRecipientIds = teachers.map((t) => t._id);
    } else {
      if (!recipientIds || recipientIds.length === 0) {
        throw new ApiError(400, 'At least one recipient is required.');
      }
      const recipients = await User.find({
        _id: { $in: recipientIds },
        role: 'teacher',
        school: schoolId,
      });
      if (recipients.length !== recipientIds.length) {
        throw new ApiError(400, 'School admin can only send notifications to teachers of their school.');
      }
      finalRecipientIds = recipientIds;
    }
  } else {
    throw new ApiError(403, 'You do not have permission to create notifications.');
  }

  const notification = await Notification.create({
    title,
    message,
    priority: priority || 'normal',
    senderId: userId,
    senderRole: role,
    recipientIds: finalRecipientIds,
    schoolId: role === 'super_admin' ? undefined : schoolId,
    targetRole,
    isBroadcast: isBroadcast || false,
    attachmentUrl,
    attachmentName,
    attachmentType,
  });

  const populatedNotification = await Notification.findById(notification._id)
    .populate('senderId', 'name email')
    .populate('recipientIds', 'name email');

  res.status(201).json({
    success: true,
    notification: populatedNotification,
  });
});

// Mark notification as read
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid notification ID');
  }

  const notification = await Notification.findById(id);

  if (!notification) throw new ApiError(404, 'Notification not found.');

  const userId = req.user._id;

  // Check if user is a recipient
  if (!notification.recipientIds.some((r) => r.toString() === userId.toString())) {
    throw new ApiError(403, 'You do not have permission to mark this notification as read.');
  }

  // Add user to readBy array if not already there
  if (!notification.readBy.includes(userId)) {
    notification.readBy.push(userId);
    await notification.save();
  }

  res.json({
    success: true,
    message: 'Notification marked as read.',
  });
});

// Mark all notifications as read
export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const schoolId = req.user.school;

  let filter = {
    recipientIds: userId,
    readBy: { $ne: userId },
  };

  if (schoolId) {
    filter.schoolId = schoolId;
  }

  await Notification.updateMany(filter, {
    $addToSet: { readBy: userId },
  });

  res.json({
    success: true,
    message: 'All notifications marked as read.',
  });
});

// Delete notification
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid notification ID');
  }

  const notification = await Notification.findById(id);

  if (!notification) throw new ApiError(404, 'Notification not found.');

  const userId = req.user._id;
  const role = req.user.role;

  // Only sender can delete notification
  if (notification.senderId.toString() !== userId.toString()) {
    throw new ApiError(403, 'You do not have permission to delete this notification.');
  }

  await Notification.findByIdAndDelete(id);

  res.json({
    success: true,
    message: 'Notification deleted successfully.',
  });
});

// Get unread count
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const schoolId = req.user.school;

  const filter = {
    recipientIds: userId,
    readBy: { $ne: userId },
  };

  if (schoolId) {
    filter.schoolId = schoolId;
  }

  const count = await Notification.countDocuments(filter);

  res.json({
    success: true,
    unreadCount: count,
  });
});
