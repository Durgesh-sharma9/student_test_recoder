import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import sendTeacherMail from '../utils/sendTeacherMail.js';

export const getUsers = asyncHandler(async (req, res) => {

  const { role } = req.query;

  const filter = {};

  if (role) {
    filter.role = role;
  }

  const schoolFilter = req.user.role === 'super_admin' ? {} : { school: req.user.school };
  const users = await User.find({ ...filter, ...schoolFilter, isActive: true })
    .select('-password')
    .populate('assignedClasses', 'className section')
    .populate('assignments.class', 'className section')
    .sort('-createdAt');

  res.json({
    success: true,
    count: users.length,
    users,
  });

});

export const getUser = asyncHandler(async (req, res) => {

  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('assignedClasses')
    .populate('assignments.class');

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  res.json({
    success: true,
    user,
  });

});

const schoolIdFromUser = (user) => user.school?._id ?? user.school;

export const createUser = asyncHandler(async (req, res) => {
  const {
    teacherName,
    name,
    email,
    password,
    role,
    phoneNo,
    assignedClasses,
    assignments,
  } = req.body;

  const schoolId = schoolIdFromUser(req.user);
  if (!schoolId) throw new ApiError(403, 'Your account is not linked to a school.');

  const userRole = role || 'teacher';

  // Check only active users
  const existing = await User.findOne({
    email,
    isActive: true,
  });

  if (existing) {
    throw new ApiError(400, 'Email already in use.');
  }

  // Generate random password if not provided
  const generatedPassword =
    password || Math.random().toString(36).slice(-8);

  // Create user
  const user = await User.create({
    school: schoolId,
    teacherName: teacherName || name,
    name: userRole === 'teacher' ? teacherName || name : name,
    email,
    password: generatedPassword,
    role: userRole,
    phoneNo,
    assignedClasses,
    assignments,
  });

  // Send email only to teachers
  if (userRole === 'teacher') {

    await sendTeacherMail(
      email,
      generatedPassword,
      teacherName || name || 'Teacher'
    );

  }

  const userObj = user.toObject();

  delete userObj.password;

  res.status(201).json({
    success: true,
    message:
      userRole === 'teacher'
        ? 'Teacher created and email sent.'
        : 'User created successfully.',
    user: userObj,
  });

});

export const updateUser = asyncHandler(async (req, res) => {
  const { password, ...updates } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  Object.assign(user, updates);
  if (updates.teacherName && user.role === 'teacher') {
    user.name = updates.teacherName;
  }

  if (password) {
    user.password = password;
  }

  await user.save();

  const userObj = user.toObject();

  delete userObj.password;

  res.json({
    success: true,
    user: userObj,
  });

});

export const deleteUser = asyncHandler(async (req, res) => {

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  // Soft delete
  user.isActive = false;

  await user.save();

  res.json({
    success: true,
    message: 'User deactivated.',
  });

});

export const assignTeacherWorkload = asyncHandler(async (req, res) => {
  const { assignedClasses = [], assignments = [] } = req.body;
  const teacher = await User.findById(req.params.id);
  if (!teacher || teacher.role !== 'teacher') throw new ApiError(404, 'Teacher not found.');

  teacher.assignedClasses = assignedClasses;
  teacher.assignments = assignments.map((a) => ({
    class: a.class,
    subject: String(a.subject).toUpperCase(),
  }));
  await teacher.save();

  const updated = await User.findById(teacher._id)
    .select('-password')
    .populate('assignedClasses', 'className section')
    .populate('assignments.class', 'className section');
  res.json({ success: true, teacher: updated });
});