import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, trim: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

activitySchema.index({ school: 1, createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
