import express from "express";
import {
  createContactFormSubmission,
  getContactFormSubmissions,
  sendContactMessage,
} from "../controllers/contactController.js";

const router = express.Router();

// POST /api/contact
router.post("/", sendContactMessage);
router.get("/contactus", getContactFormSubmissions);
router.post("/contactus", createContactFormSubmission);
router.get("/contact-us", getContactFormSubmissions);
router.post("/contact-us", createContactFormSubmission);

router.get("/blogs-contact", getContactFormSubmissions);
router.post("/blogs-contact", createContactFormSubmission);
router.get("/blog-contact", getContactFormSubmissions);
router.post("/blog-contact", createContactFormSubmission);

router.get("/faqs-contact", getContactFormSubmissions);
router.post("/faqs-contact", createContactFormSubmission);
router.get("/faq-contact", getContactFormSubmissions);
router.post("/faq-contact", createContactFormSubmission);

export default router;
