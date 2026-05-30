import { Router } from 'express';
import { getClassResults, exportClassResultsPDF } from '../controllers/classResultsController.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireSchoolActive } from '../middleware/tenant.js';

const router = Router();

router.use(protect, requireSchoolActive, authorize('school_admin'));

router.get('/', getClassResults);
router.get('/export-pdf', exportClassResultsPDF);

export default router;
