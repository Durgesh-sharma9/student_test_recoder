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
  getParentDailyTests,
  getParentMainExams,
  getParentExamDetails,
  getAdminParents,
  getAdminParentDetails,
  toggleParentStatus,
  resetParentPassword,
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
router.get('/students/:studentId/daily-tests', getParentDailyTests);
router.get('/students/:studentId/main-exams', getParentMainExams);
router.get('/students/:studentId/main-exams/:examType', getParentExamDetails);

// Admin parent management routes
router.get('/admin/list', getAdminParents);
router.get('/admin/:parentId', getAdminParentDetails);
router.put('/admin/:parentId/status', toggleParentStatus);
router.post('/admin/:parentId/reset-password', resetParentPassword);

export default router;
