import { Router } from 'express';
import {
  getClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  getClassStudents,
  getSuggestions,
} from '../controllers/classController.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireSchoolActive } from '../middleware/tenant.js';

const router = Router();

router.use(protect, requireSchoolActive);

router.get('/suggestions', getSuggestions);
router.get('/', getClasses);
router.get('/:id', getClass);
router.get('/:id/students', getClassStudents);

router.post('/', authorize('school_admin'), createClass);
router.put('/:id', authorize('school_admin'), updateClass);
router.delete('/:id', authorize('school_admin'), deleteClass);

export default router;
