import { Router } from 'express';
import multer from 'multer';
import { createPoll, getPollById, getPolls, respondToPoll } from '../controllers/pollController.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireSchoolActive } from '../middleware/tenant.js';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);
router.get('/', requireSchoolActive, getPolls);
router.get('/:id', requireSchoolActive, getPollById);
router.post('/', authorize('school_admin'), requireSchoolActive, upload.single('attachment'), createPoll);
router.post('/:id/respond', requireSchoolActive, respondToPoll);

export default router;
