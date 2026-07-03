import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getStudentPerformanceAnalytics, getExamTypes } from '../controllers/studentPerformanceController.js';
import { requireSchoolActive } from '../middleware/tenant.js';

const router = express.Router();

router.use(protect, requireSchoolActive);

router.get(
  '/analytics',
  authorize('super_admin', 'school_admin', 'admin'),
  getStudentPerformanceAnalytics
);

router.get(
  '/exam-types',
  authorize('super_admin', 'school_admin', 'admin'),
  getExamTypes
);

export default router;