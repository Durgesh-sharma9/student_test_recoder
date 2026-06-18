import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import School from '../models/School.js';
import Plan from '../models/Plan.js';
import AcademicSession from '../models/AcademicSession.js';
import Parent from '../models/Parent.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import passport from '../config/passport.js';

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

  let trialPlan = await Plan.findOne({ slug: 'trial' });
  if (!trialPlan) {
    trialPlan = await Plan.create({
      name: 'Trial',
      slug: 'trial',
      durationDays: 14,
      maxTeachers: 10,
      maxStudents: 200,
    });
  }

  const planExpiresAt = new Date();
  planExpiresAt.setDate(planExpiresAt.getDate() + trialPlan.durationDays);

  const school = await School.create({
    schoolName,
    adminName,
    email: email.toLowerCase(),
    phone,
    plan: trialPlan._id,
    planExpiresAt,
  });

  const admin = await User.create({
    school: school._id,
    name: adminName,
    email: email.toLowerCase(),
    password,
    role: 'school_admin',
    phoneNo: phone,
  });

  // Auto-create current academic session
  await ensureActiveSession(school._id);

  admin.password = undefined;
  sendTokenResponse(admin, res, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated.');
  }

  if (user.status === 'Inactive') {
    throw new ApiError(403, 'Teacher account is inactive. Please contact administrator.');
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
        email: user.email,
        phone: user.phone,
        role: 'parent',
        school: user.school,
        isActive: true,
        status: user.status,
        mustChangePassword: false
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

  const role = user.role === 'admin' ? 'school_admin' : user.role;
  
  // Ensure name field is set correctly based on role
  const userObj = { ...user, role, mustChangePassword: user.mustChangePassword || false };
  
  // For teachers, prioritize teacherName over name
  if (userObj.role === 'teacher' && userObj.teacherName) {
    userObj.name = userObj.teacherName;
  }
  // For parents, parentName should already be set to name
  // For admins, use name field
  
  res.json({ success: true, user: userObj });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
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

  user.password = newPassword;
  if (role !== 'parent') {
    user.mustChangePassword = false; // Reset the flag after successful password change
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

  // Create a user-like object for token generation
  const userObj = {
    _id: parent._id.toString(),
    name: parent.parentName,
    email: parent.email,
    phone: parent.phone,
    role: 'parent',
    school: parent.school,
    isActive: true,
    status: 'Active'
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

      // Generate JWT token
      const token = signToken(user._id);
      
      // Prepare user object
      let userObj;
      if (user.role === 'parent') {
        userObj = {
          _id: user._id.toString(),
          name: user.parentName,
          email: user.email,
          phone: user.phone,
          role: 'parent',
          school: user.school,
          isActive: true,
          status: user.status,
          authProvider: user.authProvider,
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
