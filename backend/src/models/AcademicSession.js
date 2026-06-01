import mongoose from 'mongoose';

const academicSessionSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    sessionName: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true }
);

// Ensure only one active session per school
academicSessionSchema.index({ school: 1, status: 1 }, { 
  partialFilterExpression: { status: 'active' },
  unique: true 
});

// Ensure unique session names per school
academicSessionSchema.index({ school: 1, sessionName: 1 }, { unique: true });

// Validate dates
academicSessionSchema.pre('save', function (next) {
  if (this.startDate >= this.endDate) {
    return next(new Error('Start date must be before end date.'));
  }
  next();
});

export default mongoose.model('AcademicSession', academicSessionSchema);
