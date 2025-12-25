// routes/verificationRoute.js

import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; 
import { executeSubscribedService, getUserVerificationHistory } from '../controllers/verificationController.js';
import { checkSubscription } from '../middleware/SubscriptionMiddleware.js'; 
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();


// `upload.single('file')` now runs before `checkSubscription`.
router
  .route('/verify')
  .post(protect, upload.fields([
      { name: 'file_front', maxCount: 1 },
      { name: 'file_back', maxCount: 1 }
    ]), checkSubscription, executeSubscribedService);

router.route('/verification-history').get(protect, getUserVerificationHistory);

export default router;