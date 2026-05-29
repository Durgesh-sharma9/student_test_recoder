import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { requireSchoolActive } from '../middleware/tenant.js';
import { listSchoolSubjects, addSchoolSubject } from '../controllers/subjectController.js';

const router = Router();

router.use(protect, requireSchoolActive, authorize('school_admin', 'admin'));

router.get('/', listSchoolSubjects);
router.post('/', addSchoolSubject);

export default router;
