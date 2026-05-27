import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, trim: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

studentSchema.index({ rollNumber: 1, class: 1 }, { unique: true });

export default mongoose.model('Student', studentSchema);
