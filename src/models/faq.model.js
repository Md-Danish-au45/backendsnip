import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
    },

    // Category wise FAQ filtering
    category: {
      type: String,
      enum: [
        "aadhaar_kyc",
        "pan_kyc",
        "voter_id_kyc",
        "driving_license_kyc",
        "kyb_business",
        "face_match",
        "passive_liveness",
        "bank_account_verify",
        "upi_verify",
        "gst_verification",
        "misc"
      ],
      required: true,
    },

    // Optional: subcategory
    subCategory: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("FAQ", faqSchema);
