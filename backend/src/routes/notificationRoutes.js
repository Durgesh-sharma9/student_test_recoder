import { Router } from 'express';
import multer from 'multer';
import {
  getNotifications,
  getNotification,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from '../controllers/notificationController.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireSchoolActive } from '../middleware/tenant.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: PDF, DOC, DOCX, XLSX, CSV, JPG, JPEG, PNG'));
    }
  },
});

router.use(protect);

// Get notifications for current user
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark all as read
router.put('/mark-all-read', markAllAsRead);

// Create notification (only super_admin and school_admin) with file upload support
router.post('/', authorize('super_admin', 'school_admin'), requireSchoolActive, upload.single('attachment'), createNotification);

// Mark as read
router.put('/:id/mark-read', markAsRead);

// Get notification by ID
router.get('/:id', getNotification);

// Delete notification (only sender can delete)
router.delete('/:id', requireSchoolActive, deleteNotification);

export default router;
