import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, trim: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('Activity', activitySchema);
