import { Router } from 'express';
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

router.use(protect);

// Get notifications for current user
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark all as read
router.put('/mark-all-read', markAllAsRead);

// Create notification (only super_admin and school_admin)
router.post('/', authorize('super_admin', 'school_admin'), requireSchoolActive, createNotification);

// Get notification by ID
router.get('/:id', getNotification);

// Mark as read
router.put('/:id/mark-read', markAsRead);

// Delete notification (only sender can delete)
router.delete('/:id', requireSchoolActive, deleteNotification);

export default router;
