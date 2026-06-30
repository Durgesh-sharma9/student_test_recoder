import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import School from '../models/School.js';
import Plan from '../models/Plan.js';
import AcademicSession from '../models/AcademicSession.js';
import Parent from '../models/Parent.js';
import TrialSettings from '../models/TrialSettings.js';
import SubscriptionHistory from '../models/SubscriptionHistory.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import passport from '../config/passport.js';
import { generateEmailVerificationToken, createOTPToken, verifyOTP, checkOTPRateLimit, isAccountLocked, incrementFailedLoginAttempts, resetFailedLoginAttempts } from '../utils/otpUtils.js';
import { createSignupOTP, verifySignupOTP as verifySignupOTPUtil, checkSignupOTPRateLimit, deleteSignupOTP } from '../utils/signupOtpUtils.js';
import { sendEmailVerificationEmail, sendPasswordChangeOTPEmail, sendEmailChangeOTPEmail, sendSignupOTPEmail } from '../services/emailService.js';
import bcrypt from 'bcryptjs';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sendTokenResponse = (user, res, statusCode = 200) => {
  const token = signToken(user._id);
  const userObj = user.toObject();
  delete userObj.password;
  if (userObj.role === 'admin') userObj.role = 'school_admin';
  
  // Ensure name field is set correctly based on role
  if (userObj.role === 'teacher' && userObj.teacherName) {
    userObj.name = userObj.teacherName;
  }

  res.status(statusCode).json({
    success: true,
    token,
    user: userObj,
  });
};

const buildAuthUserObject = (user) => {
  if (!user) return null;

  const source =
    typeof user.toObject === 'function'
      ? user.toObject({ virtuals: true })
      : { ...user };

  delete source.password;

  const role = source.role === 'admin' ? 'school_admin' : source.role;
  const name =
    role === 'teacher'
      ? source.teacherName || source.name
      : role === 'parent'
        ? source.parentName || source.name
        : source.name || source.adminName || source.parentName || source.teacherName;

  return {
    ...source,
    role,
    name,
    mustChangePassword: source.mustChangePassword || false,
  };
};

// Helper function to ensure active session exists for a school
const ensureActiveSession = async (schoolId) => {
  const existingActive = await AcademicSession.findOne({
    school: schoolId,
    status: 'active'
  });
  
  if (existingActive) return existingActive;
  
  // Create default session
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const sessionName = `${currentYear}-${nextYear.toString().slice(-2)}`;
  const startDate = new Date(currentYear, 5, 1); // June 1st
  const endDate = new Date(nextYear, 2, 31); // March 31st
  
  const newSession = await AcademicSession.create({
    school: schoolId,
    sessionName,
    startDate,
    endDate,
    status: 'active'
  });
  
  return newSession;
};

export const registerSchool = asyncHandler(async (req, res) => {
  const { schoolName, adminName, email, phone, password } = req.body;

  if (!schoolName || !adminName || !email || !password) {
    throw new ApiError(400, 'School name, admin name, email, and password are required.');
  }

  const existingSchool = await School.findOne({ email: email.toLowerCase() });
  if (existingSchool) throw new ApiError(400, 'A school with this email already exists.');

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) throw new ApiError(400, 'Email already in use.');

  // Get trial settings
  const trialSettings = await TrialSettings.getSettings();
  let trialPlan = await Plan.findOne({ slug: 'trial' });
  
  if (!trialPlan) {
    trialPlan = await Plan.create({
      name: 'Trial',
      slug: 'trial',
      durationDays: trialSettings.durationDays,
      maxTeachers: 10,
      maxStudents: 200,
    });
  }

  const planExpiresAt = new Date();
  planExpiresAt.setDate(planExpiresAt.getDate() + trialSettings.durationDays);

  const school = await School.create({
    schoolName,
    adminName,
    email: email.toLowerCase(),
    phone,
    plan: trialPlan._id,
    planExpiresAt,
    trialUsed: true,
  });

  // Create subscription history entry
  await SubscriptionHistory.create({
    school: school._id,
    plan: trialPlan._id,
    action: 'trial_started',
    expiryDate: planExpiresAt,
  });

  const admin = await User.create({
    school: school._id,
    name: adminName,
    email: email.toLowerCase(),
    password,
    role: 'school_admin',
    phoneNo: phone,
    isEmailVerified: false,
  });

  // Auto-create current academic session
  await ensureActiveSession(school._id);

  // Generate email verification token
  const verificationToken = generateEmailVerificationToken();
  admin.emailVerificationToken = verificationToken;
  admin.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await admin.save();

  // Send verification email
  try {
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    await sendEmailVerificationEmail(
      schoolName,
      adminName,
      email.toLowerCase(),
      verificationToken,
      frontendUrl
    );
  } catch (emailError) {
    console.error('[Email Error] Failed to send verification email:', emailError.message);
    // Continue with signup even if email fails
  }

  admin.password = undefined;
  admin.emailVerificationToken = undefined;
  admin.emailVerificationExpires = undefined;
  sendTokenResponse(admin, res, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log('[Login] Login attempt for email:', email);

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  console.log('[Login] User found:', !!user);
  if (user) {
    console.log('[Login] User details:', {
      _id: user._id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      passwordExists: !!user.password,
      passwordLength: user.password?.length,
      authProvider: user.authProvider,
    });
  }

  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Check if account is locked
  if (isAccountLocked(user)) {
    const lockTimeRemaining = Math.ceil((user.lockUntil - new Date()) / (1000 * 60));
    throw new ApiError(429, `Too many failed login attempts. Please try again in ${lockTimeRemaining} minutes.`);
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated.');
  }

  if (user.status === 'Inactive') {
    throw new ApiError(403, 'Teacher account is inactive. Please contact administrator.');
  }

  // Check email verification for school_admin and super_admin only
  if ((user.role === 'school_admin' || user.role === 'super_admin') && !user.isEmailVerified) {
    throw new ApiError(403, 'Please verify your email before logging in.');
  }

  if (user.role !== 'super_admin' && user.school) {
    const school = await School.findById(user.school);
    if (!school?.isActive) throw new ApiError(403, 'School account is deactivated.');
    if (school.planExpiresAt && new Date() > school.planExpiresAt) {
      throw new ApiError(403, 'School plan has expired.');
    }
    
    // Auto-create current academic session for school admin
    if (user.role === 'school_admin' || user.role === 'admin') {
      await ensureActiveSession(user.school);
    }
  }

  const passwordMatch = await user.comparePassword(password);
  console.log('[Login] Password match:', passwordMatch);

  if (!passwordMatch) {
    // Increment failed login attempts
    await incrementFailedLoginAttempts(user);
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Reset failed login attempts on successful login
  await resetFailedLoginAttempts(user);

  user.password = undefined;
  if (user.role === 'admin') user.role = 'school_admin';
  
  const userObj = user.toObject();
  userObj.mustChangePassword = user.mustChangePassword || false;
  
  sendTokenResponse(user, res);
});

export const getMe = asyncHandler(async (req, res) => {
  // Try to find user first (for admin/teacher)
  let user = await User.findById(req.user._id)
    .select('-password')
    .populate('school', 'schoolName planExpiresAt isActive')
    .populate('assignedClasses', 'className section')
    .populate('assignments.class', 'className section');

  // If not found in User, try Parent (for parents)
  if (!user) {
    user = await Parent.findById(req.user._id).select('-password').populate('school', 'schoolName planExpiresAt isActive');
    if (user) {
      // Convert Parent to user-like object
      user = {
        _id: user._id,
        name: user.parentName,
        parentName: user.parentName,
        email: user.email,
        phone: user.phone,
        role: 'parent',
        school: user.school,
        isActive: true,
        status: user.status,
        mustChangePassword: false,
        lastLogin: user.lastLogin || null,
        authProvider: user.authProvider || 'local',
      };
    }
  }

  // Fallback: if assignments array is empty but assignedClasses exists, create assignment objects
  if (user && user.role === 'teacher' && (!user.assignments || user.assignments.length === 0) && user.assignedClasses && user.assignedClasses.length > 0) {
    user.assignments = user.assignedClasses.map((c) => ({
      class: c,
      subject: 'Assigned'
    }));
  }

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const userObj = buildAuthUserObject(user);
  res.json({ success: true, user: userObj });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, otp } = req.body;
  const role = req.user.role;
  const userId = req.user._id;

  console.log('[changePassword] User role:', role);
  console.log('[changePassword] User ID:', userId);

  let user;
  
  if (role === 'parent') {
    user = await Parent.findById(userId).select('+password');
    console.log('[changePassword] Parent found:', !!user);
  } else {
    user = await User.findById(userId).select('+password');
    console.log('[changePassword] User found:', !!user);
  }

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  console.log('[changePassword] Comparing password...');
  const isPasswordValid = await user.comparePassword(currentPassword);
  console.log('[changePassword] Password valid:', isPasswordValid);

  if (!isPasswordValid) {
    throw new ApiError(400, 'Current password is incorrect.');
  }

  // For school_admin and super_admin, require OTP verification
  if (role === 'school_admin' || role === 'super_admin') {
    if (!otp) {
      throw new ApiError(400, 'OTP is required for password change.');
    }

    const otpResult = await verifyOTP(userId, 'password_change', otp);
    if (!otpResult.valid) {
      throw new ApiError(400, otpResult.message);
    }
  }

  user.password = newPassword;
  if (role !== 'parent') {
    user.mustChangePassword = false; // Reset the flag after successful password change
    user.lastPasswordChange = new Date(); // Track last password change
  }
  await user.save();

  res.json({ success: true, message: 'Password updated successfully.' });
});

export const resetTeacherPassword = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const schoolId = req.user.school?._id ?? req.user.school;

  // Verify the user is a teacher in the same school
  const teacher = await User.findOne({ _id: userId, school: schoolId, role: 'teacher' });
  if (!teacher) {
    throw new ApiError(404, 'Teacher not found.');
  }

  // Generate new temporary password
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const length = Math.floor(Math.random() * 3) + 8; // 8-10 characters
  let newPassword = '';
  for (let i = 0; i < length; i++) {
    newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Update teacher password and set mustChangePassword flag
  teacher.password = newPassword;
  teacher.mustChangePassword = true;
  await teacher.save();

  // Send email with new password
  try {
    const School = await import('../models/School.js').then(m => m.default);
    const { sendTeacherCreationEmail } = await import('../services/emailService.js');
    
    const school = await School.findById(schoolId);
    const schoolName = school?.schoolName || 'Your School';
    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;

    await sendTeacherCreationEmail(
      schoolName,
      teacher.teacherName || teacher.name,
      teacher.email,
      newPassword,
      loginUrl
    );
  } catch (emailError) {
    console.error('[Email Error] Failed to send password reset email:', emailError.message);
  }

  res.json({ 
    success: true, 
    message: 'Password reset successfully. New temporary password has been sent to the teacher.' 
  });
});

export const parentLogin = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;

  if (!password) {
    throw new ApiError(400, 'Password is required.');
  }

  if (!email && !phone) {
    throw new ApiError(400, 'Email or phone is required.');
  }

  let parent;
  
  // Try to find parent by email first
  if (email) {
    parent = await Parent.findOne({ email: email.toLowerCase(), status: 'Active' }).select('+password');
  }
  
  // If not found by email, try by phone
  if (!parent && phone) {
    parent = await Parent.findOne({ phone: phone.trim(), status: 'Active' }).select('+password');
  }

  if (!parent) {
    console.log('Parent not found for email:', email, 'phone:', phone);
    throw new ApiError(401, 'Invalid credentials.');
  }

  console.log('Parent found:', parent._id, 'email:', parent.email, 'phone:', parent.phone);
  console.log('Parent _id type:', typeof parent._id);
  console.log('Parent _id value:', parent._id.toString());
  console.log('Password comparison...');
  const isPasswordValid = await parent.comparePassword(password);
  console.log('Password valid:', isPasswordValid);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials.');
  }

  // Check if parent's school is active
  if (parent.school) {
    const school = await School.findById(parent.school);
    if (!school?.isActive) throw new ApiError(403, 'School account is deactivated.');
    if (school.planExpiresAt && new Date() > school.planExpiresAt) {
      throw new ApiError(403, 'School plan has expired.');
    }
  }

  parent.lastLogin = new Date();
  await parent.save();

  // Create a user-like object for token generation
  const userObj = {
    _id: parent._id.toString(),
    name: parent.parentName,
    parentName: parent.parentName,
    email: parent.email,
    phone: parent.phone,
    role: 'parent',
    school: parent.school,
    isActive: true,
    status: 'Active',
    lastLogin: parent.lastLogin,
    authProvider: parent.authProvider || 'local',
  };

  console.log('userObj._id:', userObj._id, 'type:', typeof userObj._id);
  const token = signToken(parent._id.toString());
  console.log('Token generated successfully for parent:', parent._id.toString());

  res.status(200).json({
    success: true,
    token,
    user: userObj,
  });
});

// Google OAuth Routes
export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
});

export const googleCallback = asyncHandler(async (req, res) => {
  passport.authenticate('google', { session: false }, async (err, user) => {
    if (err || !user) {
      const errorMessage = err?.message || 'Authentication failed';
      console.error('[Google Auth Error]', errorMessage);
      // Default to parent-login for Parent Google auth errors
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/parent-login?error=${encodeURIComponent(errorMessage)}`);
    }

    try {
      // Check if user is active
      if (!user.isActive) {
        const redirectPath = user.role === 'parent' ? '/parent-login' : '/login';
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}${redirectPath}?error=${encodeURIComponent('Account is deactivated.')}`);
      }

      if (user.status === 'Inactive') {
        const redirectPath = user.role === 'parent' ? '/parent-login' : '/login';
        const errorMessage = user.role === 'parent' 
          ? 'Your parent account is inactive. Please contact your school administration.'
          : 'Teacher account is inactive. Please contact administrator.';
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}${redirectPath}?error=${encodeURIComponent(errorMessage)}`);
      }

      // Check if school is active (for non-super_admin users)
      if (user.role !== 'super_admin' && user.school) {
        const school = await School.findById(user.school);
        if (!school?.isActive) {
          const redirectPath = user.role === 'parent' ? '/parent-login' : '/login';
          return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}${redirectPath}?error=${encodeURIComponent('School account is deactivated.')}`);
        }
        if (school.planExpiresAt && new Date() > school.planExpiresAt) {
          const redirectPath = user.role === 'parent' ? '/parent-login' : '/login';
          return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}${redirectPath}?error=${encodeURIComponent('School plan has expired.')}`);
        }

        // Auto-create current academic session for school admin
        if (user.role === 'school_admin' || user.role === 'admin') {
          await ensureActiveSession(user.school);
        }
      }

      // Auto-verify email for Google login
      if (!user.isEmailVerified && (user.role === 'school_admin' || user.role === 'super_admin')) {
        user.isEmailVerified = true;
      }

      if (user.role === 'parent' || user.role === 'teacher' || user.role === 'school_admin' || user.role === 'admin' || user.role === 'super_admin') {
        user.lastLogin = new Date();
      }
      await user.save();

      // Generate JWT token
      const token = signToken(user._id);
      
      // Prepare user object
      let userObj;
      if (user.role === 'parent') {
        userObj = {
          _id: user._id.toString(),
          name: user.parentName,
          parentName: user.parentName,
          email: user.email,
          phone: user.phone,
          role: 'parent',
          school: user.school,
          isActive: true,
          status: user.status,
          authProvider: user.authProvider,
          lastLogin: user.lastLogin || null,
        };
      } else {
        userObj = user.toObject();
        delete userObj.password;
        if (userObj.role === 'admin') userObj.role = 'school_admin';
        if (userObj.role === 'teacher' && userObj.teacherName) {
          userObj.name = userObj.teacherName;
        }
        userObj.authProvider = user.authProvider;
      }

      // Redirect to frontend with token
      const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userObj))}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('[Google Callback Error]', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/parent-login?error=${encodeURIComponent('Authentication failed. Please try again.')}`);
    }
  })(req, res);
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new ApiError(400, 'Verification token is required.');
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired verification link.');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json({
    success: true,
    message: 'Email verified successfully. You can now login.',
  });
});

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email is required.');
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, 'Email is already verified.');
  }

  if (user.role !== 'school_admin' && user.role !== 'super_admin') {
    throw new ApiError(403, 'Email verification is only required for admin accounts.');
  }

  // Generate new verification token
  const verificationToken = generateEmailVerificationToken();
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await user.save();

  // Send verification email
  try {
    const school = await School.findById(user.school);
    const schoolName = school?.schoolName || 'Your School';
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    
    await sendEmailVerificationEmail(
      schoolName,
      user.name,
      user.email,
      verificationToken,
      frontendUrl
    );
  } catch (emailError) {
    console.error('[Email Error] Failed to send verification email:', emailError.message);
    throw new ApiError(500, 'Failed to send verification email. Please try again.');
  }

  res.json({
    success: true,
    message: 'Verification email sent successfully.',
  });
});

export const sendPasswordChangeOTP = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;

  // Only allow OTP for school_admin and super_admin
  if (role !== 'school_admin' && role !== 'super_admin') {
    throw new ApiError(403, 'OTP verification is only required for admin accounts.');
  }

  // Check rate limit
  const rateLimitCheck = await checkOTPRateLimit(userId, 'password_change');
  if (!rateLimitCheck.allowed) {
    throw new ApiError(429, rateLimitCheck.message);
  }

  // Generate and send OTP
  const otp = await createOTPToken(userId, 'password_change');

  // Send OTP email
  try {
    const user = await User.findById(userId);
    const school = await School.findById(user.school);
    const schoolName = school?.schoolName || 'Your School';
    
    await sendPasswordChangeOTPEmail(
      schoolName,
      user.name,
      user.email,
      otp
    );
  } catch (emailError) {
    console.error('[Email Error] Failed to send OTP email:', emailError.message);
    throw new ApiError(500, 'Failed to send OTP. Please try again.');
  }

  res.json({
    success: true,
    message: 'OTP sent successfully to your email.',
  });
});

export const sendSignupOTP = asyncHandler(async (req, res) => {
  const { schoolName, adminName, email, password, phone, planId, planExpiresAt } = req.body;

  console.log('[sendSignupOTP] Received signup request');
  console.log('[sendSignupOTP] Email:', email);
  console.log('[sendSignupOTP] School:', schoolName);
  console.log('[sendSignupOTP] Admin Name:', adminName);
  console.log('[sendSignupOTP] Phone:', phone);
  console.log('[sendSignupOTP] Plan ID:', planId);
  console.log('[sendSignupOTP] Plan Expires At:', planExpiresAt);

  // Validate required fields
  if (!schoolName || !adminName || !email || !password || !phone) {
    throw new ApiError(400, 'All required fields must be provided.');
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(400, 'Email already registered.');
  }

  // Check if school name already exists
  const existingSchool = await School.findOne({ schoolName });
  if (existingSchool) {
    throw new ApiError(400, 'School name already exists.');
  }

  // Check rate limit for signup OTP (30 second cooldown)
  const rateLimitCheck = await checkSignupOTPRateLimit(email);
  if (!rateLimitCheck.allowed) {
    throw new ApiError(429, rateLimitCheck.message);
  }

  // Get trial plan if not provided
  let finalPlanId = planId;
  let finalPlanExpiresAt = planExpiresAt;

  if (!finalPlanId) {
    const trialPlan = await Plan.findOne({ name: 'Trial' });
    if (!trialPlan) {
      throw new ApiError(500, 'Trial plan not found. Please contact support.');
    }
    finalPlanId = trialPlan._id;
    
    // Calculate plan expiry
    finalPlanExpiresAt = new Date();
    finalPlanExpiresAt.setDate(finalPlanExpiresAt.getDate() + trialPlan.durationDays);
    
    console.log('[sendSignupOTP] Using trial plan:', trialPlan.name);
    console.log('[sendSignupOTP] Plan ID:', finalPlanId);
    console.log('[sendSignupOTP] Plan Expires At:', finalPlanExpiresAt);
  }

  // Hash password before storing in signupData
  // NOTE: We store plain password and let User model hash it during creation
  // to avoid double-hashing issue with User model's pre-save hook
  const signupData = {
    schoolName,
    adminName,
    email: email.toLowerCase(),
    phone,
    password, // Store plain password, will be hashed by User model
    planId: finalPlanId,
    planExpiresAt: finalPlanExpiresAt,
  };

  console.log('[sendSignupOTP] Saving OTP signupData:', {
    schoolName,
    adminName,
    email: email.toLowerCase(),
    phone,
    password: '[PLAIN - will be hashed by User model]',
    planId: finalPlanId,
    planExpiresAt: finalPlanExpiresAt,
  });

  console.log('[sendSignupOTP] Signup Data to store:', signupData);

  // Generate OTP and store signup data with hashed password
  const otp = await createSignupOTP(email, signupData);

  console.log('[sendSignupOTP] OTP generated:', otp);

  // Send OTP email
  try {
    await sendSignupOTPEmail(adminName, email.toLowerCase(), otp);
    console.log('[sendSignupOTP] OTP email sent successfully to:', email.toLowerCase());
  } catch (emailError) {
    console.error('[Email Error] Failed to send OTP email:', emailError.message);
    throw new ApiError(500, 'Failed to send OTP. Please try again.');
  }

  res.json({
    success: true,
    message: 'OTP sent successfully to your email.',
  });
});

export const verifySignupOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  console.log('[verifySignupOTP] Received verification request');
  console.log('[verifySignupOTP] Email from request:', email);
  console.log('[verifySignupOTP] OTP from request:', otp);

  if (!email || !otp) {
    throw new ApiError(400, 'Email and OTP are required.');
  }

  // Verify OTP
  const otpResult = await verifySignupOTPUtil(email, otp);
  if (!otpResult.valid) {
    throw new ApiError(400, otpResult.message);
  }

  console.log('[verifySignupOTP] OTP verified successfully');
  console.log('[verifySignupOTP] OTP Record:', otpResult.signupOTP);
  console.log('[verifySignupOTP] OTP Record signupData:', otpResult.signupOTP.signupData);
  console.log('[verifySignupOTP] Email from signupData:', otpResult.signupOTP.signupData?.email);
  console.log('[verifySignupOTP] Admin Name from signupData:', otpResult.signupOTP.signupData?.adminName);

  // Retrieve signup data from SignupOTP
  const signupData = otpResult.signupOTP.signupData;
  
  if (!signupData) {
    console.error('[verifySignupOTP] Signup Data is missing!');
    throw new ApiError(400, 'Signup data not found. Please try again.');
  }

  console.log('[verifySignupOTP] Retrieved signup data:', signupData);

  // Mark OTP as used
  await otpResult.signupOTP.markAsUsed();

  // Create school and admin account
  console.log('[verifySignupOTP] School payload:', {
    email: signupData?.email,
    adminName: signupData?.adminName,
    schoolName: signupData?.schoolName,
    phone: signupData?.phone,
    plan: signupData?.planId,
    planExpiresAt: signupData?.planExpiresAt,
  });

  try {
    const school = await School.create({
      schoolName: signupData.schoolName,
      adminName: signupData.adminName,
      email: signupData.email,
      phone: signupData.phone,
      plan: signupData.planId,
      planExpiresAt: signupData.planExpiresAt,
      isActive: true,
    });

    console.log('[verifySignupOTP] School created with ID:', school._id);

    console.log('[verifySignupOTP] Creating admin with data:', {
      school: school._id,
      name: signupData.adminName,
      email: signupData.email,
      phoneNo: signupData.phone,
    });

    console.log('[verifySignupOTP] Signup Data:', signupData);
    console.log('[verifySignupOTP] Creating User:', {
      email: signupData.email,
      role: 'school_admin',
      passwordExists: !!signupData.password,
      passwordLength: signupData.password?.length,
    });

    const admin = await User.create({
      school: school._id,
      name: signupData.adminName,
      email: signupData.email,
      password: signupData.password, // Plain password, will be hashed by User model pre-save hook
      role: 'school_admin',
      phoneNo: signupData.phone,
      isEmailVerified: true, // Mark as verified since OTP was verified
    });

    console.log('[verifySignupOTP] Created User:', {
      _id: admin._id,
      email: admin.email,
      role: admin.role,
      passwordExists: !!admin.password,
      passwordLength: admin.password?.length,
      isEmailVerified: admin.isEmailVerified,
    });

    console.log('[verifySignupOTP] Admin created with ID:', admin._id);

    // Auto-create current academic session
    await ensureActiveSession(school._id);

    console.log('[verifySignupOTP] Account created successfully');

    // Delete OTP record after successful verification
    await deleteSignupOTP(email);

    admin.password = undefined;
    console.log('[verifySignupOTP] Sending token response with user:', {
      _id: admin._id,
      email: admin.email,
      role: admin.role,
    });
    sendTokenResponse(admin, res, 201);
  } catch (error) {
    console.error('[verifySignupOTP] Error creating account:', error);
    throw new ApiError(500, error.message || 'Failed to create account');
  }
});
