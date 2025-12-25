
import Coupon from '../models/CouponModel.js';

// @desc    Create a new coupon
// @route   POST /api/coupons
// @access  Private/Admin
export const createCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private/Admin
export const getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({});
    res.status(200).json({ success: true, count: coupons.length, data: coupons });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single coupon by ID
// @route   GET /api/coupons/:id
// @access  Private/Admin
export const getCouponById = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      res.status(404);
      throw new Error('Coupon not found');
    }
    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single coupon by its code
// @route   GET /api/coupons/code/:code
// @access  Private (for logged-in users)
export const getCouponByCode = async (req, res, next) => {
    try {
        const coupon = await Coupon.findOne({ code: req.params.code.toUpperCase() });
        if (!coupon || !coupon.isActive) {
            res.status(404);
            throw new Error('Coupon is not valid or does not exist.');
        }
        res.status(200).json({ success: true, data: coupon });
    } catch (error) {
        next(error);
    }
};


// @desc    Update a coupon
// @route   PUT /api/coupons/:id
// @access  Private/Admin
export const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!coupon) {
      res.status(404);
      throw new Error('Coupon not found');
    }
    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
export const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      res.status(404);
      throw new Error('Coupon not found');
    }
    res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    next(error);
  }
};