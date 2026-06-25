import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const signupOTPSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    isUsed: { type: Boolean, default: false },
    signupData: {
      schoolName: { type: String, required: true },
      adminName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      password: { type: String, required: true }, // Plain password, will be hashed by User model
      planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
      planExpiresAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Index for cleanup of expired tokens
signupOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Unique index on email for active OTPs
signupOTPSchema.index({ email: 1, isUsed: 1 }, { unique: true, partialFilterExpression: { isUsed: false } });

// Hash OTP before saving
signupOTPSchema.pre('save', async function (next) {
  if (!this.isModified('otp')) return next();
  this.otp = await bcrypt.hash(this.otp, 10);
  next();
});

// Method to verify OTP
signupOTPSchema.methods.verifyOTP = async function (candidateOTP) {
  if (this.isUsed) return false;
  if (this.expiresAt < new Date()) return false;
  if (this.attempts >= 5) return false; // 5 attempts limit
  
  const isValid = await bcrypt.compare(candidateOTP, this.otp);
  if (!isValid) {
    this.attempts += 1;
    await this.save();
  }
  return isValid;
};

// Method to mark as used
signupOTPSchema.methods.markAsUsed = async function () {
  this.isUsed = true;
  await this.save();
};

export default mongoose.model('SignupOTP', signupOTPSchema);
