// // src/routes/kycRoutes.js
// import express from 'express';
// import { verifyPan } from '../controllers/gridLinesController.js';
// import { protect } from '../middleware/authMiddleware.js';
// import { validatePan } from '../middleware/gridLinesMiddleware.js';

// const router = express.Router();

// router.use(protect);

// // @route POST /api/kyc/verify-pan
// router.post('/verify-pan', validatePan, verifyPan);



// export default router;