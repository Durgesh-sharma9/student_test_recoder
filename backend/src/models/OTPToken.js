import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Optional for signup
    type: {
      type: String,
      enum: ['password_change', 'email_change', 'verification', 'signup'],
      required: true,
    },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    isUsed: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed }, // For storing additional data like new email for email_change or signup data
  },
  { timestamps: true }
);

// Index for cleanup of expired tokens
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Hash OTP before saving
otpTokenSchema.pre('save', async function (next) {
  if (!this.isModified('otp')) return next();
  this.otp = await bcrypt.hash(this.otp, 10);
  next();
});

// Method to verify OTP
otpTokenSchema.methods.verifyOTP = async function (candidateOTP) {
  if (this.isUsed) return false;
  if (this.expiresAt < new Date()) return false;
  if (this.attempts >= 3) return false;
  
  const isValid = await bcrypt.compare(candidateOTP, this.otp);
  if (!isValid) {
    this.attempts += 1;
    await this.save();
  }
  return isValid;
};

// Method to mark as used
otpTokenSchema.methods.markAsUsed = async function () {
  this.isUsed = true;
  await this.save();
};

export default mongoose.model('OTPToken', otpTokenSchema);
