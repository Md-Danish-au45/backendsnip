import mongoose from "mongoose";

const contactFormSubmissionSchema = new mongoose.Schema(
  {
    formType: {
      type: String,
      enum: ["contact_us", "blog_contact", "faq_contact"],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 30,
    },
    company: {
      type: String,
      default: "",
      trim: true,
      maxlength: 160,
    },
    subject: {
      type: String,
      default: "",
      trim: true,
      maxlength: 240,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    source: {
      type: String,
      default: "website",
      trim: true,
      maxlength: 120,
    },
    pageUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    blogSlug: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
    faqSlug: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
    ipAddress: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },
  },
  { timestamps: true }
);

contactFormSubmissionSchema.index({ formType: 1, createdAt: -1 });
contactFormSubmissionSchema.index({ email: 1, createdAt: -1 });

const ContactFormSubmission = mongoose.model("ContactFormSubmission", contactFormSubmissionSchema);

export default ContactFormSubmission;
