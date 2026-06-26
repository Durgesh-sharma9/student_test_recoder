import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import { requireSchoolActive } from '../middleware/tenant.js';
import {
  getPlans,
  getPlanDetails,
  getPaymentSettings,
  generateUpiQr,
  submitSubscriptionRequest,
  getSubscriptionStatus,
} from '../controllers/subscriptionController.js';

const router = Router();

// Configure multer for optional screenshot upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Allowed types: JPG, JPEG, PNG'));
  },
});

router.use(protect, requireSchoolActive);

router.get('/plans', getPlans);
router.get('/plans/:id', getPlanDetails);
router.get('/payment-settings', getPaymentSettings);

router.post('/upi-qr', generateUpiQr);
router.post('/requests', upload.single('screenshot'), submitSubscriptionRequest);
router.get('/status', getSubscriptionStatus);

export default router;

