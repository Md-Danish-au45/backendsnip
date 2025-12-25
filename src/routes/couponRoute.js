// routes/couponRoute.js

import express from 'express';
import {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  getCouponByCode, // For user-side validation
} from '../controllers/couponController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin-only routes
router
  .route('/')
  .post(protect, authorize('admin'), createCoupon)
  .get(protect, authorize('admin'), getAllCoupons);

router
  .route('/:id')
  .get(protect, authorize('admin'), getCouponById)
  .put(protect, authorize('admin'), updateCoupon)
  .delete(protect, authorize('admin'), deleteCoupon);

// Route for users to validate a coupon code
router.route('/code/:code').get(protect, getCouponByCode);

export default router;