import express from "express";
import rateLimit from "express-rate-limit";
import {
  serveAllUrlsText,
  serveBlogSitemapXml,
  serveEntriesStructureJson,
  serveFaqText,
  serveFaqSitemapXml,
  serveImageSitemapXml,
  serveLlmsFullMarkdown,
  serveLlmsText,
  servePageSitemapXml,
  serveProductSitemapXml,
  regenerateSeoAssets,
  serveSeoContentMarkdown,
  serveSitemapIndexXml,
  serveSitemapXml,
} from "../controllers/seoController.js";

const router = express.Router();
const seoRegenerateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many regenerate requests, try again later.",
  },
});

router.get("/sitemap.xml", serveSitemapXml);
router.get("/sitemap-index.xml", serveSitemapIndexXml);
router.get("/page-sitemap.xml", servePageSitemapXml);
router.get("/blog-sitemap.xml", serveBlogSitemapXml);
router.get("/faq-sitemap.xml", serveFaqSitemapXml);
router.get("/product-sitemap.xml", serveProductSitemapXml);
router.get("/image-sitemap.xml", serveImageSitemapXml);
router.get("/faq.txt", serveFaqText);
router.get("/llms.txt", serveLlmsText);
router.get("/llms-full.md", serveLlmsFullMarkdown);
router.get("/all-urls.txt", serveAllUrlsText);
router.get("/entries-structure.json", serveEntriesStructureJson);
router.get("/seo-content.md", serveSeoContentMarkdown);
router.post("/regenerate", seoRegenerateLimiter, regenerateSeoAssets);

export default router;
