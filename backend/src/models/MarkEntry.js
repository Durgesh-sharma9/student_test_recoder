import mongoose from 'mongoose';

const markEntrySchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'ResultSession', required: true },
    academicSession: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    marksObtained: { type: Number, required: true, min: 0 },
    percentage: { type: Number, required: true },
    rankSubject: { type: Number, default: 0 },
    status: { type: String, enum: ['present', 'absent'], default: 'present' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

markEntrySchema.index({ session: 1, student: 1 }, { unique: true });

export default mongoose.model('MarkEntry', markEntrySchema);
