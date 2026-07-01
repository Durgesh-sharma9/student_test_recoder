import mongoose from 'mongoose';

const notebookChapterUnlockSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    academicSession: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subject: { type: String, required: true, trim: true, uppercase: true },
    unlockedChapters: [{ type: Number, required: true }],
  },
  { timestamps: true }
);

// Ensure only one record per class per subject in a given academic session
notebookChapterUnlockSchema.index(
  { school: 1, academicSession: 1, class: 1, subject: 1 },
  { unique: true }
);

export default mongoose.model('NotebookChapterUnlock', notebookChapterUnlockSchema);
