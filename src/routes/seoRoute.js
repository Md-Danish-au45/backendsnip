import express from "express";
import { serveFaqText, serveLlmsText, serveSitemapXml } from "../controllers/seoController.js";

const router = express.Router();

router.get("/sitemap.xml", serveSitemapXml);
router.get("/faq.txt", serveFaqText);
router.get("/llms.txt", serveLlmsText);

export default router;

