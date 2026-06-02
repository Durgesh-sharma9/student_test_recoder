import express from 'express';
import {
  getParents,
  getParent,
  createParent,
  updateParent,
  deleteParent,
  linkStudentToParent,
  unlinkStudentFromParent,
  sendParentCredentials,
  getParentStudents,
  getParentStudentDetails,
} from '../controllers/parentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getParents)
  .post(createParent);

router.route('/:id')
  .get(getParent)
  .put(updateParent)
  .delete(deleteParent);

router.post('/link-student', linkStudentToParent);
router.post('/unlink-student', unlinkStudentFromParent);
router.post('/send-credentials', sendParentCredentials);
router.get('/students', getParentStudents);
router.get('/students/:studentId', getParentStudentDetails);

export default router;
