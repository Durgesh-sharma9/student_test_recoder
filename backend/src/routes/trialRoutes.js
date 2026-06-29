import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  submitTrialRequest,
  getTrialRequests,
  approveTrialRequest,
  rejectTrialRequest,
} from '../controllers/trialController.js';

const router = Router();

router.use(protect);

// School admin submits trial request
router.post('/submit', submitTrialRequest);

// Super admin views and manages trial requests
router.get('/', getTrialRequests);
router.patch('/:id/approve', approveTrialRequest);
router.patch('/:id/reject', rejectTrialRequest);

export default router;
