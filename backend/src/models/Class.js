import mongoose from 'mongoose';

const classSchema = new mongoose.Schema(
  {
    className: { type: String, required: true, trim: true, uppercase: true },
    section: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

classSchema.index({ className: 1, section: 1, academicYear: 1 }, { unique: true });

export default mongoose.model('Class', classSchema);
