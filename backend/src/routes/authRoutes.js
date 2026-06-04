import { Router } from 'express';
import { login, registerSchool, getMe, changePassword, parentLogin, resetTeacherPassword } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/register-school', registerSchool);
router.post('/login', login);
router.post('/parent-login', parentLogin);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.post('/reset-teacher-password/:userId', protect, authorize('school_admin'), resetTeacherPassword);

export default router;
