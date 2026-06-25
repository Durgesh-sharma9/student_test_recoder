import crypto from 'crypto';
import OTPToken from '../models/OTPToken.js';

// Generate a 6-digit OTP
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Generate email verification token
export const generateEmailVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Create OTP token in database
export const createOTPToken = async (userId, type, metadata = {}) => {
  // Invalidate any existing OTP tokens of the same type for this user
  await OTPToken.deleteMany({ user: userId, type, isUsed: false });

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const otpToken = await OTPToken.create({
    user: userId,
    type,
    otp,
    expiresAt,
    metadata,
  });

  return otp; // Return plain OTP for sending in email
};

// Verify OTP
export const verifyOTP = async (userId, type, candidateOTP) => {
  const otpToken = await OTPToken.findOne({
    user: userId,
    type,
    isUsed: false,
  });

  if (!otpToken) {
    return { valid: false, message: 'OTP not found' };
  }

  if (otpToken.expiresAt < new Date()) {
    return { valid: false, message: 'OTP expired' };
  }

  const isValid = await otpToken.verifyOTP(candidateOTP);
  
  if (!isValid) {
    return { valid: false, message: 'Invalid OTP' };
  }

  // Mark as used
  await otpToken.markAsUsed();

  return { valid: true, message: 'OTP verified successfully' };
};

// Check rate limiting for OTP requests
export const checkOTPRateLimit = async (userId, type) => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  
  const recentOTPs = await OTPToken.countDocuments({
    user: userId,
    type,
    createdAt: { $gte: tenMinutesAgo },
  });

  if (recentOTPs >= 3) {
    return { allowed: false, message: 'Too many OTP requests. Please try again later.' };
  }

  return { allowed: true };
};

// Check if account is locked due to failed login attempts
export const isAccountLocked = (user) => {
  if (!user.lockUntil) return false;
  return user.lockUntil > new Date();
};

// Increment failed login attempts
export const incrementFailedLoginAttempts = async (user) => {
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
  
  if (user.failedLoginAttempts >= 5) {
    // Lock account for 15 minutes
    user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  
  await user.save();
};

// Reset failed login attempts on successful login
export const resetFailedLoginAttempts = async (user) => {
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLogin = new Date();
  await user.save();
};
