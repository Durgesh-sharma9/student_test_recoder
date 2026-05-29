import School from '../models/School.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Attach schoolId filter for tenant-scoped queries */
export const getSchoolFilter = (user) => {
  if (user.role === 'super_admin') return {};
  if (!user.school) throw new ApiError(403, 'No school associated with this account.');
  return { school: user.school };
};

export const requireSchoolActive = asyncHandler(async (req, res, next) => {
  // Auth runs on individual routers after this middleware — skip until user is loaded
  if (!req.user) return next();

  if (req.user.role === 'super_admin') return next();

  if (!req.user.school) {
    throw new ApiError(403, 'School account required.');
  }

  const school = await School.findById(req.user.school).populate('plan');
  if (!school) throw new ApiError(404, 'School not found.');
  if (!school.isActive) throw new ApiError(403, 'School account is deactivated.');
  if (school.planExpiresAt && new Date() > school.planExpiresAt) {
    throw new ApiError(403, 'School plan has expired. Please contact support.');
  }

  req.school = school;
  next();
});

export const attachSchoolId = (req, res, next) => {
  if (req.user.role !== 'super_admin' && req.user.school) {
    req.body.school = req.user.school;
  }
  next();
};
