import mongoose from 'mongoose';

const PricingPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a plan name (e.g., Personal, Professional)'],
      unique: true,
      trim: true,
    },
    monthly: {
      price: {
        type: Number,
        required: [true, 'Please provide a monthly price'],
        min: 0,
      },
      limitPerMonth: {
        type: Number,
        required: [true, 'Please provide the monthly usage limit'],
        min: 0,
      },
    },
    yearly: {
      price: {
        type: Number,
        required: [true, 'Please provide a yearly price'],
        min: 0,
      },
      limitPerMonth: {
        type: Number,
        required: [true, 'Please provide the yearly usage limit'],
        min: 0,
      },
    },
    monthStartDate: {
      type: Number,
      required: [true, 'Please provide the start day of the month for the billing cycle (1-28)'],
      min: 1,
      max: 28,
      default: 1,
    },
    includedServices: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
    }],
  },
  {
    timestamps: true,
  }
);

const PricingPlan = mongoose.model('PricingPlan', PricingPlanSchema);

export default PricingPlan;