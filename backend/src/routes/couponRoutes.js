import express from 'express';
import {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  incrementCouponUsage,
} from '../controllers/couponController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route for validating coupons (no auth required for validation)
router.post('/validate', validateCoupon);

// All other coupon routes require super admin role
router.use(protect);
router.use(authorize('super_admin'));

router.route('/')
  .get(getCoupons)
  .post(createCoupon);

router.route('/:id')
  .get(getCouponById)
  .put(updateCoupon)
  .delete(deleteCoupon);

// Internal route for incrementing coupon usage
router.post('/increment-usage', incrementCouponUsage);

export default router;
