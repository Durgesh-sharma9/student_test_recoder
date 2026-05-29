import { Router } from 'express';

import {
  protect,
  authorize,
} from '../middleware/auth.js';
import { requireSchoolActive } from '../middleware/tenant.js';

import {
  getAssignedSubjects,
} from '../controllers/teacherController.js';

const router = Router();

router.use(protect, requireSchoolActive);

router.get(
  '/subjects',
  authorize('teacher'),
  getAssignedSubjects
);

export default router;