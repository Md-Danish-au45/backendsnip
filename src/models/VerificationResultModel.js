import mongoose from 'mongoose';

const VerificationResultSchema = new mongoose.Schema(
  {
    // A user-friendly, unique ID for reference
    verificationId: {
      type: String,
      required: true,
      unique: true,
    },
    // Link to the user who performed the verification
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Link to the service that was used
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    // The final status of the verification
    status: {
      type: String,
      required: true,
      enum: ['success', 'failed'],
    },
    // The data the user submitted for the verification
    inputPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    // The full JSON response from the third-party API
    resultData: {
      type: mongoose.Schema.Types.Mixed,
    },
    // If the verification failed, store the reason
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Index for efficiently fetching a user's history, sorted by most recent
VerificationResultSchema.index({ user: 1, createdAt: -1 });

const VerificationResult = mongoose.model('VerificationResult', VerificationResultSchema);

export default VerificationResult;