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

router.route('/')
  .get(authorize('super_admin', 'school_admin', 'admin', 'teacher'), getSessions)
  .post(authorize('school_admin', 'admin'), createSession);

router.get('/active', authorize('super_admin', 'school_admin', 'admin', 'teacher'), getActiveSession);

router.route('/:id')
  .get(authorize('super_admin', 'school_admin', 'admin', 'teacher'), getSessionById)
  .put(authorize('school_admin', 'admin'), updateSession);

export default router;
