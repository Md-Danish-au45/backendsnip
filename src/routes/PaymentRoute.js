import express from 'express';
import { createSubscriptionOrder, verifySubscriptionPayment, createDynamicSubscriptionOrder } from '../controllers/PaymentController.js';
import { protect } from '../middleware/authMiddleware.js';
import multer from 'multer';

const router = express.Router();

// Configure multer to use memory storage. This is necessary so that if a service
// requires a file upload, the file data can be processed and forwarded.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * @route   POST /api/payment/order
 * @desc    Creates a Razorpay order before payment.
 * @access  Private
 */
router.route('/order').post(protect, createSubscriptionOrder);

router.route('/dynamic-order').post(protect, createDynamicSubscriptionOrder);
/**
 * @route   POST /api/payment/verify
 * @desc    Verifies the payment and then executes the service.
 * Uses `upload.any()` to handle potential file uploads (multipart/form-data).
 * @access  Private
 */
router.route('/verify').post(protect, upload.any(), verifySubscriptionPayment);

export default router;
