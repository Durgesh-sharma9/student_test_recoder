import { Router } from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  assignTeacherWorkload,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin'));

router.route('/').get(getUsers).post(createUser);
router.route('/:id').get(getUser).put(updateUser).delete(deleteUser);
router.put('/:id/assignments', assignTeacherWorkload);

export default router;
