import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { requireSchoolActive } from '../middleware/tenant.js';
import {
  getNotebookGrid,
  updateChapterStatus,
  getAdminAnalytics,
  getParentProgress,
  unlockChapter,
  lockChapter
} from '../controllers/notebookController.js';

const router = express.Router();

router.use(protect, requireSchoolActive);

// Teacher Routes (Grid view and Auto-save)
router.get('/grid', authorize('teacher'), getNotebookGrid);
router.post('/update', authorize('teacher'), updateChapterStatus);
router.post('/unlock', authorize('teacher'), unlockChapter);
router.post('/lock', authorize('teacher'), lockChapter);

// Admin Routes (Analytics and Export)
router.get('/analytics', authorize('school_admin', 'super_admin'), getAdminAnalytics);

// Parent Routes (Read-only progress)
router.get('/parent/:studentId', authorize('parent'), getParentProgress);

export default router;