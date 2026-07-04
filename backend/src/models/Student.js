import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    academicSession: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession', required: true },
    name: { type: String, required: true, trim: true },
    rollNo: { type: String, required: true, trim: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent' },
    admissionDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

studentSchema.index(
  { school: 1, class: 1, rollNo: 1 },
  {
    unique: true,
    partialFilterExpression: { rollNo: { $type: 'string' }, isActive: true },
  }
);

export default mongoose.model('Student', studentSchema);
