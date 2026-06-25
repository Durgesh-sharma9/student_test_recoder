import { Router } from 'express';
import { login, registerSchool, getMe, changePassword, parentLogin, resetTeacherPassword, googleAuth, googleCallback, verifyEmail, resendVerificationEmail, sendPasswordChangeOTP, sendSignupOTP, verifySignupOTP } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/register-school', registerSchool);
router.post('/login', login);
router.post('/parent-login', parentLogin);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.post('/reset-teacher-password/:userId', protect, authorize('school_admin'), resetTeacherPassword);

// Email Verification Routes
router.get('/verify-email', verifyEmail);
router.post('/resend-verification-email', resendVerificationEmail);

// Password Change OTP Route
router.post('/send-password-change-otp', protect, sendPasswordChangeOTP);

// Signup OTP Routes
router.post('/send-signup-otp', sendSignupOTP);
router.post('/verify-signup-otp', verifySignupOTP);

// Google OAuth Routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

export default router;
