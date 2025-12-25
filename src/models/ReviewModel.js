import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: false, // MODIFIED: No longer required
      // MODIFIED: Removed unique constraint from here
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true, // MODIFIED: A review must now be tied to a service
    },
    category: {
        type: String,
        required: false,
    },
    rating: {
      type: Number,
      required: [true, 'Please provide a rating between 1 and 5'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
ReviewSchema.index({ service: 1, rating: -1 });
ReviewSchema.index({ user: 1 });

// A user can only review a specific service once. This is the key constraint.
ReviewSchema.index({ user: 1, service: 1 }, { unique: true });


const Review = mongoose.model('Review', ReviewSchema);
export default Review;