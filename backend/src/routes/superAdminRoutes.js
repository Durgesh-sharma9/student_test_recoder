import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  dashboard,
  getPlans,
  upsertPlan,
  getSchools,
  getSchoolDetails,
  updateSchoolStatus,
  extendSchoolPlan,
  downloadSchoolData,
} from '../controllers/superAdminController.js';

const router = Router();

router.use(protect, authorize('super_admin'));

router.get('/dashboard', dashboard);
router.get('/plans', getPlans);
router.post('/plans', upsertPlan);
router.get('/schools', getSchools);
router.get('/schools/:id', getSchoolDetails);
router.patch('/schools/:id/status', updateSchoolStatus);
router.patch('/schools/:id/plan', extendSchoolPlan);
router.get('/schools/:id/export/:type', downloadSchoolData);

export default router;
