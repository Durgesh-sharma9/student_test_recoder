import mongoose from 'mongoose';

const schoolSchema = new mongoose.Schema(
  {
    schoolName: { type: String, required: true, trim: true },
    adminName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    planExpiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    subjects: [{ type: String, trim: true, uppercase: true }],
  },
  { timestamps: true }
);

schoolSchema.virtual('isExpired').get(function () {
  return this.planExpiresAt && new Date() > this.planExpiresAt;
});

schoolSchema.set('toJSON', { virtuals: true });
schoolSchema.set('toObject', { virtuals: true });

export default mongoose.model('School', schoolSchema);
