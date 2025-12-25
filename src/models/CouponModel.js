// models/CouponModel.js

import mongoose from 'mongoose';

// Re-defining DiscountSchema here for encapsulation, similar to the one in Service.js
const DiscountSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['percentage', 'fixed'],
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const CouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    discount: {
      type: DiscountSchema,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiryDate: {
      type: Date,
      required: false,
    },
    minAmount: {
      type: Number,
      default: 0,
    },
    // To which service categories the coupon can be applied. Empty array means it applies to all.
    applicableCategories: {
        type: [String],
        default: []
    },
    maxUses: {
      type: Number,
      default: 1, // Default to single use
    },
    timesUsed: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Coupon = mongoose.model('Coupon', CouponSchema);
export default Coupon;