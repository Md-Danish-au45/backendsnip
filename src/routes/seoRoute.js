import express from "express";
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
router.post("/regenerate", regenerateSeoAssets);

export default router;
