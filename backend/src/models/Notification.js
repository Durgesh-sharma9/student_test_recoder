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
      enum: ['super_admin', 'school_admin', 'teacher'],
      required: true,
    },
    recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    targetRole: {
      type: String,
      enum: ['school_admin', 'teacher'],
    },
    isBroadcast: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

notificationSchema.index({ schoolId: 1, createdAt: -1 });
notificationSchema.index({ recipientIds: 1, createdAt: -1 });
notificationSchema.index({ senderId: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
