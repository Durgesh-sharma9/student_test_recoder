import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  listTeacherPerformance,
  getTeacherPerformanceDetails,
} from '../controllers/teacherPerformanceController.js';

const router = express.Router();

router.use(protect, authorize('school_admin'));

router.get('/', listTeacherPerformance);
router.get('/detail', getTeacherPerformanceDetails);

export default router;

