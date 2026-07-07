import mongoose from 'mongoose';

const pollResponseSchema = new mongoose.Schema(
  {
    poll: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'userModel' },
    userModel: { type: String, required: true, enum: ['User', 'Parent'] },
    selectedOptionIndexes: [{ type: Number, required: true }],
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

pollResponseSchema.index({ poll: 1, user: 1 }, { unique: true });
pollResponseSchema.index({ poll: 1, submittedAt: -1 });

export default mongoose.model('PollResponse', pollResponseSchema);
