import { validationResult } from 'express-validator';
import Review from '../models/ReviewModel.js';
import Transaction from '../models/TransactionModel.js';
import Service from '../models/Service.js'


/**
 * @description Delete all reviews (Admin only)
 * @route DELETE /api/reviews
 * @access Private/Admin
 */
export const deleteAllReviews = async (req, res) => {
    try {
        const result = await Review.deleteMany({});
        res.status(200).json({
            success: true,
            message: 'All reviews deleted successfully',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @description Create a new review.
 * @route POST /api/reviews
 * @access Private
 */
export const createReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { rating, comment, serviceId } = req.body;
  const userId = req.user.id;

  try {
    //  Verify the service exists to get its details (like subcategory)
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found.' });
    }

    // ELIGIBILITY LOGIC
    // A user can review if:
    // a) They have used the current specific service.
    // OR
    // b) They have used any service within the same subcategory.
    const hasUsedServiceInCategory = req.user.usedServices?.some(
      (usedService) => 
        usedService.service.toString() === serviceId ||
        (service.subcategory && usedService.subcategory === service.subcategory)
    );

    if (!hasUsedServiceInCategory) {
      return res.status(403).json({
        success: false,
        error: 'You must use a service in this category to leave a review.',
      });
    }

    //  Create the review
    const review = await Review.create({
      user: userId,
      service: serviceId,
      rating,
      comment,
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error(error);
    // Handle case where user has already reviewed this specific service (unique index violation)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'You have already submitted a review for this service.',
      });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};


/**
 * @description Update an existing review.
 * @route PATCH /api/reviews/:id
 * @access Private (Author only)
 */
export const updateReview = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        let review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, error: 'Review not found' });
        }

        if (review.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Not authorized to update this review' });
        }

        const { rating, comment } = req.body;
        if (rating) review.rating = rating;
        if (comment !== undefined) review.comment = comment;

        await review.save();

        res.status(200).json({ success: true, data: review });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @description Get all reviews for a specific service.
 * @route GET /api/services/:serviceId/reviews
 * @access Public
 */
export const getServiceReviews = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const reviews = await Review.find({ service: serviceId })
            .populate('user', 'name') 
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Review.countDocuments({ service: serviceId });

        res.status(200).json({
            success: true,
            count: reviews.length,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            },
            data: reviews,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};


/**
 * @description Get all reviews written by the current user.
 * @route GET /api/reviews/me
 * @access Private
 */
export const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ user: req.user.id })
            .populate('service', 'name')
            .populate('user', 'name');

        res.status(200).json({ success: true, count: reviews.length, data: reviews });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @description Get all reviews in the system (Admin only).
 * @route GET /api/reviews/all
 * @access Private/Admin
 */
export const getAllReviews = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const reviews = await Review.find({})
            .populate('user', 'name email') 
            .populate('service', 'name')     
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Review.countDocuments({});

        res.status(200).json({
            success: true,
            count: reviews.length,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            },
            data: reviews,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
}


/**
 * @description Delete a review by its ID (Admin or Author).
 * @route DELETE /api/reviews/:id
 * @access Private
 */
export const deleteReviewById = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
       
        if (!review) {
            return res.status(404).json({ success: false, error: 'Review not found' });
        }

        // Check if user is the author or an admin
        if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Not authorized to delete this review' });
        }

        await review.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};