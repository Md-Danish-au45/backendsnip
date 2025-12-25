import express from 'express';
import authenticateApiKey from '../middleware/apiKeyAuth.js';
import { executeSubscribedService } from '../controllers/verificationController.js';
import { checkSubscription } from '../middleware/SubscriptionMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import { apiLoggingMiddleware } from '../middleware/apiLoggingMiddleware.js';

const router = express.Router();

// Helper middleware to map :serviceKey param into body when using path param style
const mapServiceKeyParam = (req, _res, next) => {
  if (!req.body.serviceKey && req.params.serviceKey) {
    req.body.serviceKey = req.params.serviceKey;
  }
  next();
};

/**
 * External API endpoint for verification
 * Uses API key authentication instead of JWT, but reuses existing verification logic
 * 
 * @route   POST /api/external/verify
 * @desc    Execute verification service using API key authentication
 * @access  External (API Key required in X-API-Key header)
 * 
 * Flow:
 * 1. authenticateApiKey - Validates API key and attaches user to req.user
 * 2. upload - Handles file uploads (same as platform)
 * 3. checkSubscription - Validates subscription (same as platform)
 * 4. executeSubscribedService - Executes verification (same as platform)
 * 
 * This ensures external API calls use the same counting and verification logic
 */
router.post(
  '/verify',
  authenticateApiKey,  // NEW: API key authentication (replaces JWT 'protect')
  apiLoggingMiddleware, // NEW: Log API access and update usage
  upload.fields([      // EXISTING: Same file upload handling
    { name: 'file_front', maxCount: 1 },
    { name: 'file_back', maxCount: 1 }
  ]),
  checkSubscription,   // EXISTING: Same subscription validation
  executeSubscribedService  // EXISTING: Same verification execution
);

/**
 * Alternate style: serviceKey in URL path, e.g. POST /api/external/verify/:serviceKey
 * This maps the param to req.body.serviceKey to reuse the same logic.
 */
router.post(
  '/verify/:serviceKey',
  authenticateApiKey,
  apiLoggingMiddleware,
  mapServiceKeyParam,
  upload.fields([
    { name: 'file_front', maxCount: 1 },
    { name: 'file_back', maxCount: 1 }
  ]),
  checkSubscription,
  executeSubscribedService
);

export default router;