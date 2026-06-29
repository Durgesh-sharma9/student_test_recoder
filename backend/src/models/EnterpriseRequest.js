import mongoose from 'mongoose';

const ENTERPRISE_STATUS = ['pending', 'contacted', 'quoted', 'approved', 'rejected'];

const enterpriseRequestSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    adminUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    instituteName: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    requiredStudents: { type: Number, required: true },
    requiredTeachers: { type: Number, required: true },
    additionalRequirements: { type: String, trim: true },

    status: { type: String, enum: ENTERPRISE_STATUS, default: 'pending', index: true },
    submittedAt: { type: Date, default: Date.now, index: true },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectMessage: { type: String, trim: true },

    // Custom plan details (when approved)
    customPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    quotedPrice: { type: Number },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

enterpriseRequestSchema.index({ status: 1, submittedAt: -1 });
enterpriseRequestSchema.index({ school: 1, submittedAt: -1 });

export default mongoose.model('EnterpriseRequest', enterpriseRequestSchema);
