import express from 'express';
import { getTrialSettings, updateTrialSettings } from '../controllers/trialSettingsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('super_admin'));

router.route('/')
  .get(getTrialSettings)
  .put(updateTrialSettings);

export default router;
