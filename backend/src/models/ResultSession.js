import mongoose from 'mongoose';
import { MAIN_EXAM_TYPES } from '../utils/constants.js';

const resultSessionSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    academicSession: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subject: { type: String, required: true, trim: true, uppercase: true },
    category: { type: String, enum: ['daily', 'main'], required: true },
    examType: { type: String, trim: true },
    testDate: { type: Date },
    examDate: { type: Date },
    maxMarks: { type: Number, required: true, min: 1 },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

resultSessionSchema.pre('validate', function (next) {
  if (this.category === 'daily') {
    this.examType = 'Daily Test';
    this.examDate = undefined;
    if (!this.testDate) return next(new Error('Test date is required for daily tests.'));
  } else if (this.category === 'main') {
    this.testDate = undefined;
    if (!MAIN_EXAM_TYPES.includes(this.examType)) {
      return next(new Error('Invalid main exam type.'));
    }
    if (!this.examDate) return next(new Error('Exam date is required for main exams.'));
  }
  next();
});

/** Daily: multiple tests allowed per school + class + subject + calendar day */
resultSessionSchema.index(
  { school: 1, class: 1, subject: 1, testDate: 1 },
  {
    partialFilterExpression: { category: 'daily' },
  }
);

/** Main: one session per school + class + subject + exam type + exam date */
resultSessionSchema.index(
  { school: 1, class: 1, subject: 1, examType: 1, examDate: 1 },
  {
    unique: true,
    partialFilterExpression: { category: 'main' },
  }
);

export default mongoose.model('ResultSession', resultSessionSchema);
