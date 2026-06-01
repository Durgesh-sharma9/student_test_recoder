import express from 'express';
import {
  getSessions,
  getActiveSession,
  createSession,
  updateSession,
  getSessionById,
} from '../controllers/academicSessionController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('school_admin', 'admin'));

router.route('/')
  .get(getSessions)
  .post(createSession);

router.get('/active', getActiveSession);

router.route('/:id')
  .get(getSessionById)
  .put(updateSession);

export default router;
