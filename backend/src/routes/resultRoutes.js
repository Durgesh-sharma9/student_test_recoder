import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  upsertSession,
  saveMarks,
  getMarksEntryData,
  getSessions,
  getResults,
  downloadResults,
  dashboardSummary,
} from '../controllers/resultController.js';

const router = Router();

router.use(protect);
router.get('/dashboard', dashboardSummary);
router.get('/sessions', getSessions);
router.post('/sessions', authorize('admin', 'teacher'), upsertSession);
router.get('/sessions/:sessionId/marks', authorize('admin', 'teacher'), getMarksEntryData);
router.put('/sessions/:sessionId/marks', authorize('admin', 'teacher'), saveMarks);
router.get('/', getResults);
router.get('/download', downloadResults);

export default router;
