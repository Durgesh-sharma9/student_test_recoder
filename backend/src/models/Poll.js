import mongoose from 'mongoose';

const pollSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    audience: { type: String, enum: ['teachers', 'parents'], required: true },
    audienceScope: { type: String, enum: ['all', 'selected_classes'], default: 'all' },
    selectedClassIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
    pollType: { type: String, enum: ['single', 'multiple'], default: 'single' },
    options: [{ text: { type: String, required: true, trim: true }, order: { type: Number, default: 0 } }],
    allowEdit: { type: Boolean, default: false },
    expiryDate: { type: Date },
    status: { type: String, enum: ['draft', 'active', 'closed', 'expired'], default: 'draft' },
    recipientCount: { type: Number, default: 0 },
    publishedAt: { type: Date },
    attachmentUrl: { type: String, trim: true },
    attachmentName: { type: String, trim: true },
    attachmentType: { type: String, trim: true },
  },
  { timestamps: true }
);

pollSchema.index({ school: 1, createdAt: -1 });
pollSchema.index({ status: 1, expiryDate: 1 });

export default mongoose.model('Poll', pollSchema);
