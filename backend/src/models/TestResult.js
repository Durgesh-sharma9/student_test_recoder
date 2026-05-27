import mongoose from 'mongoose';

const subjectMarkSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    marksObtained: { type: Number, required: true, min: 0 },
    maxMarks: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const testResultSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    testName: { type: String, required: true, trim: true },
    testDate: { type: Date, required: true },
    subjects: [subjectMarkSchema],
    totalObtained: { type: Number, required: true },
    totalMax: { type: Number, required: true },
    average: { type: Number, required: true },
    percentage: { type: Number, required: true },
    rank: { type: Number, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

testResultSchema.index({ student: 1, testName: 1, testDate: 1 }, { unique: true });
testResultSchema.index({ class: 1, testName: 1, testDate: 1 });

export default mongoose.model('TestResult', testResultSchema);
