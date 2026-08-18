import mongoose from 'mongoose';

const attendanceRecordSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    status: { type: String, enum: ['present', 'absent', 'leave'], default: 'present', required: true },
    remarks: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    academicSession: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' },
    date: { type: Date, required: true },
    dateString: { type: String, required: true }, // Format: YYYY-MM-DD for easy lookup
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    records: [attendanceRecordSchema],
    totalStudents: { type: Number, default: 0 },
    totalPresent: { type: Number, default: 0 },
    totalAbsent: { type: Number, default: 0 },
    totalLeave: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound unique index for school + class + dateString
attendanceSchema.index({ school: 1, class: 1, dateString: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
