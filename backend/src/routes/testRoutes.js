import { Router } from 'express';
import {
  downloadTemplate,
  uploadMarks,
  getTestResults,
  getTestResult,
  getStudentProgress,
  exportResults,
  deleteTestResult,
  getDashboardStats,
} from '../controllers/testController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadExcel } from '../middleware/upload.js';

const router = Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/progress/:studentId', getStudentProgress);
router.get('/export', authorize('admin', 'teacher'), exportResults);
router.get('/template', authorize('teacher', 'admin'), downloadTemplate);
router.post('/upload', authorize('teacher', 'admin'), uploadExcel.single('file'), uploadMarks);
router.get('/', getTestResults);
router.get('/:id', getTestResult);
router.delete('/:id', authorize('admin', 'teacher'), deleteTestResult);

export default router;
