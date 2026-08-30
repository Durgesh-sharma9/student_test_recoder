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
import crypto from 'crypto';
import { generateEmailVerificationToken, createOTPToken, verifyOTP, checkOTPRateLimit, isAccountLocked, incrementFailedLoginAttempts, resetFailedLoginAttempts } from '../utils/otpUtils.js';
import { createSignupOTP, verifySignupOTP as verifySignupOTPUtil, checkSignupOTPRateLimit, deleteSignupOTP } from '../utils/signupOtpUtils.js';
import { sendEmailVerificationEmail, sendPasswordChangeOTPEmail, sendEmailChangeOTPEmail, sendSignupOTPEmail, sendResetPasswordEmail } from '../services/emailService.js';
import bcrypt from 'bcryptjs';
import PaymentSettings from '../models/PaymentSettings.js';

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
  if (existingSchool) throw new ApiError(400, 'Email already registered. Please login instead.');

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) throw new ApiError(400, 'Email already registered. Please login instead.');

  if (phone) {
    const existingPhoneSchool = await School.findOne({ phone: phone.trim() });
    const existingPhoneUser = await User.findOne({ phoneNo: phone.trim() });
    if (existingPhoneSchool || existingPhoneUser) {
      throw new ApiError(400, 'Phone number already registered.');
    }
  }

  // Get trial settings
  const trialSettings = await TrialSettings.getSettings().catch(() => ({ durationDays: 14 }));
  let trialPlan = await Plan.findOne({ slug: 'trial' }) || await Plan.findOne({ planType: 'trial' }) || await Plan.findOne({ name: /trial/i }) || await Plan.findOne();
  const durationDays = trialPlan?.durationDays || trialSettings?.durationDays || 14;

  if (!trialPlan) {
    trialPlan = await Plan.create({
      name: 'Trial',
      slug: 'trial',
      planType: 'trial',
      durationDays: durationDays,
      maxTeachers: 5,
      maxStudents: 20,
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

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  let user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    const parentDoc = await Parent.findOne({ email: email.toLowerCase() }).select('+password');
    if (parentDoc) {
      user = {
        _id: parentDoc._id,
        name: parentDoc.parentName,
        parentName: parentDoc.parentName,
        email: parentDoc.email,
        role: 'parent',
        school: parentDoc.school,
        isActive: parentDoc.status === 'Active',
        status: parentDoc.status,
        comparePassword: (pwd) => parentDoc.comparePassword(pwd),
        toObject: () => ({
          _id: parentDoc._id,
          name: parentDoc.parentName,
          parentName: parentDoc.parentName,
          email: parentDoc.email,
          role: 'parent',
          school: parentDoc.school,
          isActive: parentDoc.status === 'Active',
          status: parentDoc.status,
        }),
      };
    }
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
    
    // Auto-create current academic session for school admin
    if (user.role === 'school_admin' || user.role === 'admin') {
      await ensureActiveSession(user.school);
    }
  }

  const passwordMatch = await user.comparePassword(password);

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
    .populate('school', 'schoolName planExpiresAt isActive schoolCode address city state pincode logo')
    .populate('assignedClasses', 'className section')
    .populate('assignments.class', 'className section');

  // If not found in User, try Parent (for parents)
  if (!user) {
    user = await Parent.findById(req.user._id).select('-password').populate('school', 'schoolName planExpiresAt isActive schoolCode address city state pincode logo');
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

  if (user) {
    if (typeof user.toObject === 'function') {
      user = user.toObject({ virtuals: true });
    }

    if (user.role === 'teacher' && (!user.assignments || user.assignments.length === 0) && user.assignedClasses && user.assignedClasses.length > 0) {
      user.assignments = user.assignedClasses.map((c) => ({
        class: c,
        subject: 'Assigned'
      }));
    }
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

  let user;
  
  if (role === 'parent') {
    user = await Parent.findById(userId).select('+password');
  } else {
    user = await User.findById(userId).select('+password');
  }

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const isPasswordValid = await user.comparePassword(currentPassword);

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
    const loginUrl = (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('localhost'))
      ? `${process.env.CLIENT_URL}/login`
      : 'https://testmaster.webncode.in/login';

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

export const impersonateTeacher = asyncHandler(async (req, res) => {
  const settings = await PaymentSettings.findOne().sort('-updatedAt -createdAt');
  const allowImpersonation = settings?.allowTeacherImpersonation ?? false;
  
  if (!allowImpersonation) {
    throw new ApiError(403, 'Teacher impersonation (Login-As) is globally disabled by Super Admin.');
  }

  const { teacherId } = req.params;
  const teacher = await User.findById(teacherId);
  if (!teacher) {
    throw new ApiError(404, 'Teacher not found.');
  }

  if (teacher.role !== 'teacher') {
    throw new ApiError(400, 'Impersonation is only allowed for teacher accounts.');
  }

  if (teacher.status && teacher.status !== 'Active') {
    throw new ApiError(400, 'Cannot impersonate an inactive teacher.');
  }

  const adminSchoolId = (req.user.school?._id || req.user.school || '').toString();
  const teacherSchoolId = (teacher.school?._id || teacher.school || '').toString();

  if (adminSchoolId !== teacherSchoolId) {
    throw new ApiError(403, 'Not authorized. This teacher does not belong to your school.');
  }

  sendTokenResponse(teacher, res);
});

export const impersonateSchoolAdmin = asyncHandler(async (req, res) => {
  const { schoolId } = req.params;
  const school = await School.findById(schoolId);
  if (!school) {
    throw new ApiError(404, 'School not found.');
  }

  const schoolAdmin = await User.findOne({
    school: schoolId,
    role: { $in: ['school_admin', 'admin'] }
  });

  if (!schoolAdmin) {
    throw new ApiError(404, 'School admin user not found.');
  }

  sendTokenResponse(schoolAdmin, res);
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
  let isPasswordValid = false;

  // 1. Try Parent model by email first
  if (email) {
    parent = await Parent.findOne({ email: email.toLowerCase(), status: 'Active' }).select('+password');
  }

  // 2. If not found by email, try by phone
  if (!parent && phone) {
    parent = await Parent.findOne({ phone: phone.trim(), status: 'Active' }).select('+password');
  }

  if (parent && parent.password) {
    isPasswordValid = await parent.comparePassword(password);
  }

  // 3. Fallback: If Parent collection check fails or invalid, try User collection with role: 'parent'
  if (!isPasswordValid && email) {
    const parentUser = await User.findOne({ email: email.toLowerCase(), role: 'parent' }).select('+password');
    if (parentUser) {
      const userPwdValid = await parentUser.comparePassword(password);
      if (userPwdValid) {
        parentUser.password = undefined;
        return sendTokenResponse(parentUser, res);
      }
    }
  }

  if (!parent || !isPasswordValid) {
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

  const token = signToken(parent._id.toString());

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

  const schoolNameTrimmed = schoolName ? schoolName.trim() : '';
  const adminNameTrimmed = adminName ? adminName.trim() : '';
  const emailNormalized = email ? email.toLowerCase().trim() : '';
  const passwordTrimmed = password ? password.trim() : '';
  const phoneTrimmed = phone ? phone.trim() : '';

  console.log('[sendSignupOTP] Received request body:', {
    schoolName: schoolNameTrimmed,
    adminName: adminNameTrimmed,
    email: emailNormalized,
    phone: phoneTrimmed,
    hasPassword: !!passwordTrimmed,
  });

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailNormalized || !emailRegex.test(emailNormalized)) {
    console.warn('[sendSignupOTP] Rejection: Invalid email format:', email);
    throw new ApiError(400, 'Please enter a valid email address.');
  }

  // Validate required fields
  if (!schoolNameTrimmed || !adminNameTrimmed || !passwordTrimmed) {
    console.warn('[sendSignupOTP] Rejection: Missing required fields');
    throw new ApiError(400, 'School name, admin name, email, and password are required.');
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email: emailNormalized });
  const existingSchoolEmail = await School.findOne({ email: emailNormalized });
  if (existingUser || existingSchoolEmail) {
    console.warn('[sendSignupOTP] Rejection: Email already registered:', emailNormalized);
    throw new ApiError(400, 'Email already registered. Please login instead.');
  }

  // Check if phone number already exists (if provided)
  if (phoneTrimmed) {
    const existingPhoneUser = await User.findOne({ phoneNo: phoneTrimmed });
    const existingPhoneSchool = await School.findOne({ phone: phoneTrimmed });
    if (existingPhoneUser || existingPhoneSchool) {
      console.warn('[sendSignupOTP] Rejection: Phone number already registered:', phoneTrimmed);
      throw new ApiError(400, 'Phone number already registered.');
    }
  }

  // Check rate limit for signup OTP (30 second cooldown)
  const rateLimitCheck = await checkSignupOTPRateLimit(emailNormalized);
  if (!rateLimitCheck.allowed) {
    console.warn('[sendSignupOTP] Rejection: Rate limit exceeded:', rateLimitCheck.message);
    throw new ApiError(429, rateLimitCheck.message);
  }

  // Get trial plan if not provided
  let finalPlanId = planId;
  let finalPlanExpiresAt = planExpiresAt;

  if (!finalPlanId) {
    let trialPlan = await Plan.findOne({ slug: 'trial' }) || await Plan.findOne({ planType: 'trial' }) || await Plan.findOne({ name: /trial/i }) || await Plan.findOne();
    const trialSettings = await TrialSettings.getSettings().catch(() => ({ durationDays: 14 }));
    const durationDays = trialPlan?.durationDays || trialSettings?.durationDays || 14;

    if (!trialPlan) {
      trialPlan = await Plan.create({
        name: 'Trial',
        slug: 'trial',
        planType: 'trial',
        durationDays: durationDays,
        maxTeachers: 5,
        maxStudents: 20,
      });
    }
    finalPlanId = trialPlan._id;
    
    // Calculate plan expiry
    finalPlanExpiresAt = new Date();
    finalPlanExpiresAt.setDate(finalPlanExpiresAt.getDate() + durationDays);
  }

  // Hash password before storing in signupData
  // NOTE: We store plain password and let User model hash it during creation
  // to avoid double-hashing issue with User model's pre-save hook
  const signupData = {
    schoolName: schoolNameTrimmed,
    adminName: adminNameTrimmed,
    email: emailNormalized,
    phone: phoneTrimmed,
    password: passwordTrimmed,
    planId: finalPlanId,
    planExpiresAt: finalPlanExpiresAt,
  };

  // Generate OTP and store signup data
  const otp = await createSignupOTP(emailNormalized, signupData);

  // Send OTP email
  try {
    await sendSignupOTPEmail(adminNameTrimmed, emailNormalized, otp);
  } catch (emailError) {
    console.error('[Email Error] Failed to send OTP email:', emailError.message);
    console.log(`[DEV OTP] OTP for ${emailNormalized}: ${otp}`);
    // If SMTP fails in local development, allow signup to continue with logged OTP
    if (process.env.NODE_ENV !== 'production') {
      return res.json({
        success: true,
        message: `OTP generated (Check console/email): ${otp}`,
      });
    }
    throw new ApiError(500, 'Failed to send OTP email. Please check email settings.');
  }

  res.json({
    success: true,
    message: 'OTP sent successfully to your email.',
  });
});

export const verifySignupOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = email ? email.toLowerCase().trim() : '';

  if (!normalizedEmail || !otp) {
    throw new ApiError(400, 'Email and OTP are required.');
  }

  console.log(`[verifySignupOTP] Verifying OTP for ${normalizedEmail}...`);

  // Check if account already exists for this email
  let existingAdmin = await User.findOne({ email: normalizedEmail });
  if (existingAdmin) {
    console.log(`[verifySignupOTP] User account already exists for ${normalizedEmail}. Returning token response.`);
    await deleteSignupOTP(normalizedEmail).catch(() => {});
    existingAdmin.password = undefined;
    return sendTokenResponse(existingAdmin, res, 200);
  }

  // Verify OTP against active SignupOTP token
  const otpResult = await verifySignupOTPUtil(normalizedEmail, otp.toString().trim());
  if (!otpResult.valid) {
    console.warn(`[verifySignupOTP] Invalid OTP attempt for ${normalizedEmail}: ${otpResult.message}`);
    throw new ApiError(400, otpResult.message || 'Invalid or expired OTP');
  }

  // Retrieve signup data stored during OTP request
  const signupData = otpResult.signupOTP.signupData;
  if (!signupData) {
    console.error('[verifySignupOTP] Signup Data is missing from OTP record!');
    throw new ApiError(400, 'Signup data not found. Please request a new OTP.');
  }

  try {
    // Create School record
    const school = await School.create({
      schoolName: signupData.schoolName,
      adminName: signupData.adminName,
      email: signupData.email,
      phone: signupData.phone,
      plan: signupData.planId,
      planExpiresAt: signupData.planExpiresAt,
      isActive: true,
    });

    // Create User record
    const admin = await User.create({
      school: school._id,
      name: signupData.adminName,
      email: signupData.email,
      password: signupData.password, // Plain password, will be hashed by User model pre-save hook
      role: 'school_admin',
      phoneNo: signupData.phone,
      isEmailVerified: true,
    });

    // Auto-create current academic session safely
    try {
      await ensureActiveSession(school._id);
    } catch (sessionErr) {
      console.error('[verifySignupOTP] Non-fatal error ensuring active session:', sessionErr.message);
    }

    // Mark OTP as used and delete record ONLY after successful creation
    await otpResult.signupOTP.markAsUsed().catch(() => {});
    await deleteSignupOTP(normalizedEmail).catch(() => {});

    console.log(`[verifySignupOTP] Account created successfully for ${normalizedEmail}.`);
    admin.password = undefined;
    sendTokenResponse(admin, res, 201);
  } catch (error) {
    console.error('[verifySignupOTP] Error creating account:', error);
    throw new ApiError(500, error.message || 'Failed to create account');
  }
});

export const updateSchoolSettings = asyncHandler(async (req, res) => {
  if (req.user.role !== 'school_admin' && req.user.role !== 'admin') {
    throw new ApiError(403, 'Access denied.');
  }

  const schoolId = req.user.school?._id || req.user.school;
  if (!schoolId) {
    throw new ApiError(404, 'School not found.');
  }

  const { schoolName, schoolCode, address, city, state, pincode, phone, email } = req.body;

  if (!schoolName) {
    throw new ApiError(400, 'School name is required.');
  }

  const school = await School.findById(schoolId);
  if (!school) {
    throw new ApiError(404, 'School not found.');
  }

  school.schoolName = schoolName;
  school.schoolCode = schoolCode;
  school.address = address;
  school.city = city;
  school.state = state;
  school.pincode = pincode;
  school.phone = phone;
  school.email = email || school.email;

  await school.save();

  res.json({ success: true, school });
});

export const updateSchoolLogo = asyncHandler(async (req, res) => {
  if (req.user.role !== 'school_admin' && req.user.role !== 'admin') {
    throw new ApiError(403, 'Access denied.');
  }

  const schoolId = req.user.school?._id || req.user.school;
  if (!schoolId) {
    throw new ApiError(404, 'School not found.');
  }

  const { logo } = req.body;

  const school = await School.findById(schoolId);
  if (!school) {
    throw new ApiError(404, 'School not found.');
  }

  school.logo = logo;
  await school.save();

  res.json({ success: true, logo });
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { name, phone, email } = req.body;

  let updatedUser;
  if (req.user.role === 'parent') {
    updatedUser = await Parent.findById(userId);
    if (!updatedUser) throw new ApiError(404, 'Parent not found.');
    if (name) updatedUser.parentName = name;
    if (phone) updatedUser.phone = phone;
    if (email) updatedUser.email = email;
    await updatedUser.save();
  } else {
    updatedUser = await User.findById(userId);
    if (!updatedUser) throw new ApiError(404, 'User not found.');
    if (name) updatedUser.name = name;
    if (req.user.role === 'teacher' && name) {
      updatedUser.teacherName = name;
    }
    if (phone) updatedUser.phoneNo = phone;
    if (email) updatedUser.email = email;
    await updatedUser.save();
  }

  res.json({ success: true, user: updatedUser });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, 'Please provide an email address.');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(404, 'No account found with this email address.');
  }

  // Check rate limit
  const rateLimitCheck = await checkOTPRateLimit(user._id, 'password_reset');
  if (!rateLimitCheck.allowed) {
    throw new ApiError(429, rateLimitCheck.message);
  }

  // Generate and set reset OTP
  const otp = await createOTPToken(user._id, 'password_reset');

  // Send Email
  try {
    const school = await School.findById(user.school);
    const schoolName = school?.schoolName || 'Your School';
    await sendResetPasswordEmail(schoolName, user.name, user.email, otp);
    res.json({ success: true, message: 'Password reset OTP sent to your email address.' });
  } catch (error) {
    throw new ApiError(500, 'Failed to send reset OTP email. Please try again later.');
  }
});

export const verifyResetOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, 'Please provide email and OTP.');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(404, 'No account found with this email address.');
  }

  // Verify OTP
  const verification = await verifyOTP(user._id, 'password_reset', otp);
  if (!verification.valid) {
    throw new ApiError(400, verification.message);
  }

  // Generate a random temporary token for password reset authorization
  const tempToken = crypto.randomBytes(20).toString('hex');
  
  // Hash token and set to resetPasswordToken field on user model
  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(tempToken)
    .digest('hex');

  // Set expire (10 minutes)
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'OTP verified successfully.', token: tempToken });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, password } = req.body;

  if (!email || !token || !password) {
    throw new ApiError(400, 'Please provide email, token, and new password.');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(404, 'No account found with this email address.');
  }

  // Hash the incoming token to compare with the one in DB
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Verify token expiry and match
  if (
    !user.resetPasswordToken ||
    user.resetPasswordToken !== hashedToken ||
    user.resetPasswordExpires < Date.now()
  ) {
    throw new ApiError(400, 'Invalid or expired reset session. Please verify OTP again.');
  }

  // Set new password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.mustChangePassword = false;
  await user.save();

  res.json({ success: true, message: 'Password reset successful. You can now login.' });
});

export const requestFeature = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const user = req.user;

  if (!message || !message.trim()) {
    throw new ApiError(400, 'Message content is required.');
  }

  // Get active super admins
  const superUsers = await User.find({ role: 'super_admin', isActive: true }).select('_id');
  const superIds = superUsers.map(u => u._id);

  if (superIds.length === 0) {
    throw new ApiError(404, 'No active Super Administrators found to receive the request.');
  }

  // Load Notification model dynamically
  const Notification = (await import('../models/Notification.js')).default;

  // Find school name to include in description if school admin/teacher
  let schoolName = 'N/A';
  if (user.school) {
    const School = (await import('../models/School.js')).default;
    const schoolDoc = await School.findById(user.school).select('schoolName');
    if (schoolDoc) {
      schoolName = schoolDoc.schoolName;
    }
  }

  const title = `Feature Request: ${user.name || 'User'}`;
  const notificationMessage = `User: ${user.name} (${user.email})\nSchool: ${schoolName}\nRole: ${user.role}\n\nRequest:\n${message}`;

  // Create notification for Super Admins
  await Notification.create({
    title,
    message: notificationMessage,
    priority: 'important',
    senderId: user._id,
    senderRole: user.role === 'admin' ? 'school_admin' : user.role,
    recipientIds: superIds,
    schoolId: user.school || undefined,
    isBroadcast: false,
    type: 'announcement',
  });

  res.json({ success: true, message: 'Feature request sent successfully to the Super Admin.' });
});

export const resetSchoolPassword = asyncHandler(async (req, res) => {
  if (req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Access denied. Super Administrator privileges required.');
  }

  const { schoolId } = req.params;
  const { password } = req.body;

  if (!password || password.trim().length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long.');
  }

  // Find the primary school administrator user associated with this school
  const adminUser = await User.findOne({ school: schoolId, role: 'school_admin' });
  if (!adminUser) {
    throw new ApiError(404, 'No school administrator user found for this school.');
  }

  // Set the new password (which will be automatically hashed on pre-save hooks or save handlers)
  adminUser.password = password;
  adminUser.mustChangePassword = true;
  await adminUser.save();

  res.json({ 
    success: true, 
    message: `Password for administrator ${adminUser.name} (${adminUser.email}) has been reset successfully.` 
  });
});
