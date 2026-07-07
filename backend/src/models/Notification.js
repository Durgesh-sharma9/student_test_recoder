import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ['info', 'normal', 'important', 'urgent'],
      default: 'normal',
    },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: {
      type: String,
      enum: ['super_admin', 'school_admin', 'teacher', 'parent'],
      required: true,
    },
    recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    targetRole: {
      type: String,
      enum: ['school_admin', 'teacher', 'parent'],
    },
    isBroadcast: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    subscriptionRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionRequest' },
    type: { type: String, enum: ['announcement', 'poll', 'feedback'], default: 'announcement' },
    pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll' },
    feedbackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' },
    // Attachment fields
    attachmentUrl: { type: String, trim: true },
    attachmentName: { type: String, trim: true },
    attachmentType: { type: String, trim: true },
  },
  { timestamps: true }
);

notificationSchema.index({ schoolId: 1, createdAt: -1 });
notificationSchema.index({ recipientIds: 1, createdAt: -1 });
notificationSchema.index({ senderId: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);