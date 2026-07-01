import mongoose from 'mongoose';

const chapterStatusSchema = new mongoose.Schema(
  {
    chapterNumber: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Checked', 'Copy Not Submitted'],
      default: 'Pending',
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const notebookCheckSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    academicSession: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    subject: { type: String, required: true, trim: true, uppercase: true },
    chapters: [chapterStatusSchema],
  },
  { timestamps: true }
);

// Ensure only one record per student per subject in a given academic session
notebookCheckSchema.index(
  { school: 1, academicSession: 1, student: 1, subject: 1 },
  { unique: true }
);

export default mongoose.model('NotebookCheck', notebookCheckSchema);