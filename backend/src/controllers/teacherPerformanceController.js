import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {
  getTeacherPerformanceSummary,
  getTeacherPerformanceDetail,
} from '../services/teacherPerformanceService.js';

const schoolIdFromReq = (req) => req.user.school?._id ?? req.user.school;

export const listTeacherPerformance = asyncHandler(async (req, res) => {
  const schoolId = schoolIdFromReq(req);
  const rows = await getTeacherPerformanceSummary(schoolId, req.query);
  res.json({ success: true, rows });
});

export const getTeacherPerformanceDetails = asyncHandler(async (req, res) => {
  const { teacherId, classId, subject } = req.query;
  if (!teacherId || !classId || !subject) {
    throw new ApiError(400, 'teacherId, classId and subject are required.');
  }

  const schoolId = schoolIdFromReq(req);
  const detail = await getTeacherPerformanceDetail(schoolId, req.query);
  if (!detail) throw new ApiError(404, 'No data found for the selected criteria.');
  res.json({ success: true, detail });
});

