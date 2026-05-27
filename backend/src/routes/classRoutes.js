import { Router } from 'express';
import {
  getClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  getClassStudents,
} from '../controllers/classController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', getClasses);
router.get('/:id', getClass);
router.get('/:id/students', getClassStudents);

router.post('/', authorize('admin'), createClass);
router.put('/:id', authorize('admin'), updateClass);
router.delete('/:id', authorize('admin'), deleteClass);

export default router;
