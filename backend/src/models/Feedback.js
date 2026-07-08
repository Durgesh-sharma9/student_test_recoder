import mongoose from 'mongoose';

const feedbackAttachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    type: { type: String, trim: true },
  },
  { _id: false }
);

const feedbackMessageSchema = new mongoose.Schema(
  {
    senderRole: { type: String, enum: ['parent', 'teacher', 'school_admin'], required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderName: { type: String, trim: true },
    content: { type: String, trim: true },
    attachments: [feedbackAttachmentSchema],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent' },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    teacherIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    taggedTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    taggedTeacherName: { type: String, trim: true },
    taggedSubject: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdByRole: { type: String, enum: ['parent', 'teacher', 'school_admin'], required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
    ticketId: { type: String, unique: true, required: true, trim: true },
    attachments: [feedbackAttachmentSchema],
    messages: [feedbackMessageSchema],
    lastReplyAt: { type: Date },
  },
  { timestamps: true }
);

feedbackSchema.index({ school: 1, createdAt: -1 });
feedbackSchema.index({ parent: 1, createdAt: -1 });
feedbackSchema.index({ teacherIds: 1, createdAt: -1 });

export default mongoose.model('Feedback', feedbackSchema);
