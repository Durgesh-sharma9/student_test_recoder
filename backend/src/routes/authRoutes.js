import { Router } from 'express';
import { login, registerSchool, getMe, changePassword, parentLogin } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/register-school', registerSchool);
router.post('/login', login);
router.post('/parent-login', parentLogin);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

export default router;
