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

export default router;
