import mongoose from 'mongoose';

const resultSessionSchema = new mongoose.Schema(
  {
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subject: { type: String, required: true, trim: true, uppercase: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    examType: {
      type: String,
      enum: ['Daily Test', 'PA1', 'PA2', 'FA1', 'FA2'],
      required: true,
    },
    maxMarks: { type: Number, required: true, min: 1 },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

resultSessionSchema.index(
  { class: 1, subject: 1, month: 1, year: 1, examType: 1 },
  { unique: true }
);

export default mongoose.model('ResultSession', resultSessionSchema);
