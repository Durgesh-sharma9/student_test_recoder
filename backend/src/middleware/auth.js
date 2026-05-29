import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const normalizeRole = (user) => {
  if (user.role === 'admin') user.role = 'school_admin';
  return user;
};

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized. Please log in.');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password');

  if (!user || !user.isActive) {
    throw new ApiError(401, 'User not found or deactivated.');
  }

  req.user = normalizeRole(user);
  next();
});

export const authorize = (...roles) => {
  const allowed = roles.flatMap((r) => (r === 'school_admin' ? ['school_admin', 'admin'] : [r]));
  return (req, res, next) => {
    const role = req.user.role === 'admin' ? 'school_admin' : req.user.role;
    if (!allowed.includes(role)) {
      throw new ApiError(403, 'You do not have permission to perform this action.');
    }
    next();
  };
};
