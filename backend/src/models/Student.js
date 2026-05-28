import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rollNo: { type: String, required: true, trim: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

studentSchema.index(
  { rollNo: 1, class: 1 },
  {
    unique: true,
    // Ignore old legacy docs where rollNo is null/missing.
    partialFilterExpression: { rollNo: { $type: 'string' } },
  }
);

export default mongoose.model('Student', studentSchema);
