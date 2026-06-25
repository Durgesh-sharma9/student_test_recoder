import crypto from 'crypto';
import SignupOTP from '../models/SignupOTP.js';

// Generate a 6-digit OTP
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Create signup OTP token in database
export const createSignupOTP = async (email, signupData) => {
  console.log('[createSignupOTP] Creating OTP for email:', email);
  console.log('[createSignupOTP] Signup Data received:', signupData);

  // Invalidate any existing OTP tokens for this email
  await SignupOTP.deleteMany({ email: email.toLowerCase(), isUsed: false });

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const signupOTP = await SignupOTP.create({
    email: email.toLowerCase(),
    otp,
    expiresAt,
    signupData,
  });

  console.log('[createSignupOTP] OTP created successfully');
  console.log('[createSignupOTP] OTP Record ID:', signupOTP._id);
  console.log('[createSignupOTP] OTP Record signupData:', signupOTP.signupData);
  return otp; // Return plain OTP for sending in email
};

// Verify signup OTP
export const verifySignupOTP = async (email, candidateOTP) => {
  console.log('[verifySignupOTP] Verifying OTP for email:', email);
  console.log('[verifySignupOTP] Candidate OTP:', candidateOTP);

  const signupOTP = await SignupOTP.findOne({
    email: email.toLowerCase(),
    isUsed: false,
  });

  console.log('[verifySignupOTP] Found OTP Record:', signupOTP);
  console.log('[verifySignupOTP] OTP Record signupData:', signupOTP?.signupData);
  console.log('[verifySignupOTP] Email from signupData:', signupOTP?.signupData?.email);
  console.log('[verifySignupOTP] Admin Name from signupData:', signupOTP?.signupData?.adminName);

  if (!signupOTP) {
    console.log('[verifySignupOTP] OTP not found');
    return { valid: false, message: 'OTP not found or expired' };
  }

  if (signupOTP.expiresAt < new Date()) {
    console.log('[verifySignupOTP] OTP expired');
    return { valid: false, message: 'OTP expired' };
  }

  const isValid = await signupOTP.verifyOTP(candidateOTP);
  
  if (!isValid) {
    console.log('[verifySignupOTP] Invalid OTP, attempts:', signupOTP.attempts);
    return { valid: false, message: 'Invalid OTP' };
  }

  console.log('[verifySignupOTP] OTP verified successfully');
  return { valid: true, signupOTP, message: 'OTP verified successfully' };
};

// Check rate limiting for signup OTP requests (30 second cooldown)
export const checkSignupOTPRateLimit = async (email) => {
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
  
  const recentOTP = await SignupOTP.findOne({
    email: email.toLowerCase(),
    createdAt: { $gte: thirtySecondsAgo },
  });

  if (recentOTP) {
    const cooldownRemaining = Math.ceil((recentOTP.createdAt.getTime() + 30000 - Date.now()) / 1000);
    return { allowed: false, message: `Please wait ${cooldownRemaining} seconds before requesting another OTP.` };
  }

  return { allowed: true };
};

// Delete signup OTP after successful verification
export const deleteSignupOTP = async (email) => {
  await SignupOTP.deleteOne({ email: email.toLowerCase() });
  console.log('[deleteSignupOTP] OTP deleted for email:', email);
};
