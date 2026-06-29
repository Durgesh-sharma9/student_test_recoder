import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  submitEnterpriseRequest,
  getEnterpriseRequests,
  updateEnterpriseStatus,
} from '../controllers/enterpriseController.js';

const router = Router();

router.use(protect);

// School admin submits enterprise request
router.post('/submit', submitEnterpriseRequest);

// Super admin views and manages enterprise requests
router.get('/', getEnterpriseRequests);
router.patch('/:id/status', updateEnterpriseStatus);

export default router;
