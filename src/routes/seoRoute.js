import express from "express";
import { serveFaqText, serveLlmsFullMarkdown, serveLlmsText, serveSitemapIndexXml, serveSitemapXml } from "../controllers/seoController.js";

const router = express.Router();

router.get("/sitemap.xml", serveSitemapXml);
router.get("/sitemap-index.xml", serveSitemapIndexXml);
router.get("/faq.txt", serveFaqText);
router.get("/llms.txt", serveLlmsText);
router.get("/llms-full.md", serveLlmsFullMarkdown);

export default router;
