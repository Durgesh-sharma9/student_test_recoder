import { Router } from 'express';
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../controllers/studentController.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireSchoolActive } from '../middleware/tenant.js';

const router = Router();

router.use(protect, requireSchoolActive);

router.get('/', getStudents);
router.get('/:id', getStudent);

router.post('/', authorize('school_admin'), createStudent);
router.put('/:id', authorize('school_admin'), updateStudent);
router.delete('/:id', authorize('school_admin'), deleteStudent);

export default router;
