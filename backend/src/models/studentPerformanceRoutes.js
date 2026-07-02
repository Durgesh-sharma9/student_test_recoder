import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getStudentPerformanceAnalytics } from '../controllers/studentPerformanceController.js';
import { verifyTenant } from '../middleware/tenant.js';

const router = express.Router();

router.use(protect);
router.use(verifyTenant);

router.get(
  '/analytics',
  authorize('super_admin', 'school_admin', 'admin'),
  getStudentPerformanceAnalytics
);

export default router;