import express from "express";
import {
  serveAllUrlsText,
  serveFaqText,
  serveImageSitemapXml,
  serveLlmsFullMarkdown,
  serveLlmsText,
  serveSitemapIndexXml,
  serveSitemapXml,
} from "../controllers/seoController.js";

const router = express.Router();

router.get("/sitemap.xml", serveSitemapXml);
router.get("/sitemap-index.xml", serveSitemapIndexXml);
router.get("/image-sitemap.xml", serveImageSitemapXml);
router.get("/faq.txt", serveFaqText);
router.get("/llms.txt", serveLlmsText);
router.get("/llms-full.md", serveLlmsFullMarkdown);
router.get("/all-urls.txt", serveAllUrlsText);

export default router;
