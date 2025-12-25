import mongoose from 'mongoose';

/**
 * @typedef {Object} Transaction
 * @property {mongoose.Schema.Types.ObjectId} user - The user who initiated the transaction.
 * @property {mongoose.Schema.Types.ObjectId} service - The service that was used.
 * @property {String} status - The outcome of the transaction ('pending', 'completed', 'failed').
 * @property {Number} quantity - The number of units consumed (default is 1).
 * @property {Number} amount - The FINAL amount charged for the transaction after discounts.
 * @property {Number} originalAmount - The original price of the service before discounts.
 * @property {Number} discountApplied - The monetary value of the discount.
 * @property {String} couponCode - The coupon code used for the discount.
 * @property {String} razorpay_order_id - The order ID from Razorpay.
 * @property {String} razorpay_payment_id - The payment ID from Razorpay after successful payment.
 * @property {String} razorpay_signature - The signature from Razorpay to verify authenticity.
 * @property {mongoose.Schema.Types.Mixed} metadata - Optional field for storing extra data.
 */

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: { type: String, required: true },
    plan: { type: String, required: true, enum: ['monthly', 'yearly'] },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    quantity: {
      type: Number,
      default: 100,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },
    duration: {
      type: String,
      default: '1 month',
    },
    amount: {
      type: Number,
      required: false, // Final amount charged
    },

    originalAmount: {
      type: Number,
      required: false,
    },
    discountApplied: {
      type: Number,
      default: 0
    },
    couponCode: {
      type: String,
      trim: true,
      required: false
    },


    razorpay_order_id: {
      type: String,
      required: false,
    },
    razorpay_payment_id: {
      type: String,
      required: false,
    },
    razorpay_signature: {
      type: String,
      required: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: true, // This adds createdAt and updatedAt fields
  }
);

// Index to optimize queries for a specific user's transactions, sorted by time.
TransactionSchema.index({ user: 1, createdAt: -1 });

// Index to find transactions by Razorpay order ID
TransactionSchema.index({ razorpay_order_id: 1 });

const Transaction = mongoose.model('Transaction', TransactionSchema);
export default Transaction;