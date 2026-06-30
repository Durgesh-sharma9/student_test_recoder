import express from 'express';
import { getSubscriptionHistory, createSubscriptionHistory } from '../controllers/subscriptionHistoryController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getSubscriptionHistory)
  .post(createSubscriptionHistory);

export default router;
