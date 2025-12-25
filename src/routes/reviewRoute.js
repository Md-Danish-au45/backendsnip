import express from 'express';
import { check, body } from 'express-validator';
import {
  createReview,
  updateReview,
  getServiceReviews, 
  getMyReviews,
  getAllReviews,
  deleteReviewById
} from '../controllers/reviewController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

// import { deleteAllReviews } from '../controllers/reviewController.js';
// import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
// router.delete('/all',deleteAllReviews);


router.route('/service/:serviceId').get(getServiceReviews);



// Route for creating a review 
router
  .route('/')
  .post(
    [
      protect,
      check('rating', 'Rating must be a number between 1 and 5').notEmpty().isInt({ min: 1, max: 5 }),
      check('comment', 'Comment must be a string').optional().isString().trim(),
      check('serviceId', 'A valid Service ID is required').isMongoId(), // MODIFIED: Now required
    ],
    createReview
  );

// Routes for updating and deleting a specific review
router
    .route('/:id')
    .patch(
        [
            protect,
            check('rating', 'Rating must be a number between 1 and 5').optional().isInt({ min: 1, max: 5 }),
            check('comment', 'Comment must be a string').optional().isString(),
        ],
        updateReview
    )
    .delete(protect, deleteReviewById);

// Route for admins to get all reviews 
router.route('/all').get(protect, authorize('admin'), getAllReviews);

// Route for a user to get their own reviews 
router.route('/me').get(protect, getMyReviews);


export default router;