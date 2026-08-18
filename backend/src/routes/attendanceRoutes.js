import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { requireSchoolActive } from '../middleware/tenant.js';
import {
  getAttendersAndTeachers,
  createAttender,
  toggleAttendancePermission,
  getAttendancePreview,
  saveAttendance,
  getAttendanceReport,
} from '../controllers/attendanceController.js';

const router = Router();

router.use(protect, requireSchoolActive);

// Attender / Teacher / Admin Attendance Entry Routes
router.get('/preview', getAttendancePreview);
router.post('/save', saveAttendance);
router.get('/reports', getAttendanceReport);

// Admin Only Routes for Attender & Permission Management
router.get('/attenders', authorize('school_admin', 'admin'), getAttendersAndTeachers);
router.post('/attenders', authorize('school_admin', 'admin'), createAttender);
router.patch('/attenders/:userId/permission', authorize('school_admin', 'admin'), toggleAttendancePermission);

export default router;
