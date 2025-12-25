import express from 'express';
import { getApiUsageAnalytics } from '../controllers/apiKeyController.js';
import { protect } from '../middleware/authMiddleware.js';
// import { protect } from '../middleware/authMiddleware.js';
// import { getApiUsageAnalytics } from '../controllers/analyticsController.js';

const router = express.Router();


router.get('/usage', protect, getApiUsageAnalytics);

export default router;