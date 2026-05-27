import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const filter = {};
  if (role) filter.role = role;

  const users = await User.find(filter)
    .select('-password')
    .populate('assignedClasses', 'name section grade')
    .populate('children', 'name rollNumber')
    .sort('-createdAt');

  res.json({ success: true, count: users.length, users });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('assignedClasses')
    .populate('children');

  if (!user) throw new ApiError(404, 'User not found.');
  res.json({ success: true, user });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, assignedClasses, children } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(400, 'Email already in use.');

  const user = await User.create({
    name,
    email,
    password: password || 'password123',
    role,
    phone,
    assignedClasses,
    children,
  });

  const userObj = user.toObject();
  delete userObj.password;

  res.status(201).json({ success: true, user: userObj });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { password, ...updates } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  Object.assign(user, updates);
  if (password) user.password = password;
  await user.save();

  const userObj = user.toObject();
  delete userObj.password;

  res.json({ success: true, user: userObj });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  user.isActive = false;
  await user.save();

  res.json({ success: true, message: 'User deactivated.' });
});
