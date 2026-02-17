import express from "express";
import authRoutes from "./authRoute.js";
import userRoutes from "./userRoute.js";
import verificationRoutes from "./verificationRoute.js";
import adminRoutes from "./adminRoute.js";
import paymentRoutes from "./PaymentRoute.js";
import pricingRoutes from "./pricingRoute.js";
import blogRoutes from "./blogRoute.js";
import apiKeyRoutes from "./apiKeyRoutes.js";
import externalApiRoutes from "./externalApiRoutes.js";
import contactRoutes from "../routes/contactRoutes.js";
import faqRoutes from "../routes/faq.routes.js";
import fireAlarmRoutes from "../routes/fireAlarmRoute.js";
import seoRoutes from "../routes/seoRoute.js";

const router = express.Router();

router.use("/auth", authRoutes);

// Keep API key routes before generic users routes.
router.use("/users/api-key", apiKeyRoutes);
router.use("/users", userRoutes);

router.use("/admin", adminRoutes);
router.use("/faqs", faqRoutes);
router.use("/seo", seoRoutes);

router.use("/verification", verificationRoutes);
router.use("/pricing", pricingRoutes);
router.use("/payment", paymentRoutes);
router.use("/blogs", blogRoutes);

// External API routes (protected by API key authentication).
router.use("/external", externalApiRoutes);

router.use("/contact", contactRoutes);
router.use("/alarms", fireAlarmRoutes);

export default router;
