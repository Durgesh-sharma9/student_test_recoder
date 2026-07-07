import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import { createFeedback, getFeedback, replyToFeedback, updateFeedbackStatus } from '../controllers/feedbackController.js';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);
router.get('/', getFeedback);
router.post('/', upload.array('attachments', 5), createFeedback);
router.post('/:id/reply', upload.array('attachments', 5), replyToFeedback);
router.put('/:id/status', updateFeedbackStatus);

export default router;
