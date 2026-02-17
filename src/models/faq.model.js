import mongoose from "mongoose";
import slugify from "slugify";

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      index: true,
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
        "General",
        "general",
        "misc"
      ],
      required: true,
      default: "general",
    },

    // Optional: subcategory
    subCategory: {
      type: String,
      default: null,
    },
    keywords: {
      type: [String],
      default: [],
    },
    seoTitle: {
      type: String,
      trim: true,
      default: "",
    },
    metaDescription: {
      type: String,
      trim: true,
      default: "",
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

faqSchema.pre("validate", function (next) {
  if (this.isModified("question") || this.isNew) {
    this.slug = slugify(this.question || "faq", {
      lower: true,
      strict: true,
      trim: true,
    });
  }

  if (!this.seoTitle) {
    this.seoTitle = this.question || "";
  }

  if (!this.metaDescription) {
    const plainAnswer = String(this.answer || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    this.metaDescription = plainAnswer.slice(0, 155);
  }

  next();
});

export default mongoose.model("FAQ", faqSchema);
