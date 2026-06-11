import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { requireSchoolActive } from '../middleware/tenant.js';
import {
  previewMarksEntry,
  saveMarksEntry,
  saveMarks,
  getMarksEntryData,
  getSessions,
  getResults,
  downloadResults,
  dashboardSummary,
  getWeakStudentsFiltered,
} from '../controllers/resultController.js';

const router = Router();

router.use(protect, requireSchoolActive);
router.get('/dashboard', dashboardSummary);
router.get('/sessions', getSessions);
router.get('/weak-students', authorize('school_admin', 'teacher'), getWeakStudentsFiltered);
router.get('/entry-preview', authorize('school_admin', 'teacher'), previewMarksEntry);
router.post('/entry-save', authorize('school_admin', 'teacher'), saveMarksEntry);
router.get('/sessions/:sessionId/marks', authorize('school_admin', 'teacher'), getMarksEntryData);
router.put('/sessions/:sessionId/marks', authorize('school_admin', 'teacher'), saveMarks);
router.get('/', getResults);
router.get('/download', downloadResults);

export default router;
