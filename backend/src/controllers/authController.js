import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import School from '../models/School.js';
import Plan from '../models/Plan.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sendTokenResponse = (user, res, statusCode = 200) => {
  const token = signToken(user._id);
  const userObj = user.toObject();
  delete userObj.password;
  if (userObj.role === 'admin') userObj.role = 'school_admin';

  res.status(statusCode).json({
    success: true,
    token,
    user: userObj,
  });
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
  }

  user.password = undefined;
  if (user.role === 'admin') user.role = 'school_admin';
  sendTokenResponse(user, res);
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password')
    .populate('school', 'schoolName planExpiresAt isActive')
    .populate('assignedClasses', 'className section')
    .populate('assignments.class', 'className section');

  const role = user.role === 'admin' ? 'school_admin' : user.role;
  res.json({ success: true, user: { ...user.toObject(), role } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect.');
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password updated successfully.' });
});
