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
import {
  getPaymentSettings,
  updatePaymentSettings,
  listSubscriptionRequests,
  getSubscriptionRequest,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
} from '../controllers/superAdminSubscriptionController.js';

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

// Subscription & Payment Settings
router.get('/payment-settings', getPaymentSettings);
router.put('/payment-settings', updatePaymentSettings);

// Manual UPI verification flow
router.get('/subscription-requests', listSubscriptionRequests);
router.get('/subscription-requests/:id', getSubscriptionRequest);
router.post('/subscription-requests/:id/approve', approveSubscriptionRequest);
router.post('/subscription-requests/:id/reject', rejectSubscriptionRequest);

export default router;
