import express from "express";
import {
  createFAQ,
  getFAQs,
  getFAQBySlug,
  updateFAQ,
  deleteFAQ,
} from "../controllers/faq.controller.js";

const router = express.Router();

router.post("/", createFAQ);
router.get("/", getFAQs);
router.get("/slug/:slug", getFAQBySlug);
router.put("/:id", updateFAQ);
router.delete("/:id", deleteFAQ);

export default router;
