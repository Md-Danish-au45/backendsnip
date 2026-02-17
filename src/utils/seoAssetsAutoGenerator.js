import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Blog from "../models/BlogModel.js";
import FAQ from "../models/faq.model.js";

const SITE_URL = (process.env.SITE_URL || "https://www.snipcol.com").replace(/\/+$/, "");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const OUTPUT_DIR = process.env.SEO_ASSETS_OUTPUT_DIR
  ? path.resolve(process.env.SEO_ASSETS_OUTPUT_DIR)
  : path.resolve(PROJECT_ROOT, "Froentend", "snipcols", "snipcol", "public");
const AUTO_WRITE_ENABLED = process.env.SEO_ASSETS_AUTO_WRITE !== "false";

const staticRoutes = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/IndustrialAutomation", changefreq: "weekly", priority: "0.9" },
  { path: "/UtilityGrid", changefreq: "weekly", priority: "0.8" },
  { path: "/SmartBuildings", changefreq: "weekly", priority: "0.8" },
  { path: "/CloudIoTBridge", changefreq: "weekly", priority: "0.8" },
  { path: "/UniversalProtocolService", changefreq: "weekly", priority: "0.9" },
  { path: "/SmartLiving", changefreq: "weekly", priority: "0.8" },
  { path: "/EdgeSecurity", changefreq: "weekly", priority: "0.8" },
  { path: "/UniversalEngineNode", changefreq: "weekly", priority: "0.8" },
  { path: "/ProtocolHealthAudit", changefreq: "weekly", priority: "0.8" },
  { path: "/FireAlarm", changefreq: "weekly", priority: "0.8" },
  { path: "/RCverification", changefreq: "weekly", priority: "0.8" },
  { path: "/OurProtocolMission", changefreq: "monthly", priority: "0.8" },
  { path: "/ArchitectSupport", changefreq: "monthly", priority: "0.8" },
  { path: "/specs", changefreq: "monthly", priority: "0.8" },
  { path: "/blog", changefreq: "daily", priority: "0.9" },
  { path: "/faqs", changefreq: "weekly", priority: "0.9" },
  { path: "/about-us", changefreq: "monthly", priority: "0.7" },
  { path: "/contact-us", changefreq: "monthly", priority: "0.7" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.4" },
  { path: "/terms-and-condition", changefreq: "yearly", priority: "0.4" },
  { path: "/disclaimer", changefreq: "yearly", priority: "0.4" },
];

const publishedBlogFilter = {
  $or: [{ status: "published" }, { status: { $exists: false } }, { status: null }],
};

const publishedFaqFilter = {
  $or: [{ isPublished: true }, { isPublished: { $exists: false } }, { isPublished: null }],
};

const xmlEscape = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const stripHtml = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toSeoSlug = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "faq";

const toIsoDate = (value) => {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const asFaqSlug = (faq) => faq?.slug || toSeoSlug(faq?.question || "");

const buildSitemapXml = (entries = []) => {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const entry of entries) {
    lines.push("  <url>");
    lines.push(`    <loc>${xmlEscape(entry.loc)}</loc>`);
    lines.push(`    <lastmod>${xmlEscape(toIsoDate(entry.lastmod))}</lastmod>`);
    lines.push(`    <changefreq>${xmlEscape(entry.changefreq || "weekly")}</changefreq>`);
    lines.push(`    <priority>${xmlEscape(entry.priority || "0.7")}</priority>`);
    lines.push("  </url>");
  }
  lines.push("</urlset>");
  return lines.join("\n");
};

const buildEmptySitemapXml = () =>
  ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', "</urlset>"].join(
    "\n"
  );

const buildSitemapIndexXml = (lastmod) =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <sitemap>",
    `    <loc>${xmlEscape(`${SITE_URL}/page-sitemap.xml`)}</loc>`,
    `    <lastmod>${xmlEscape(toIsoDate(lastmod))}</lastmod>`,
    "  </sitemap>",
    "  <sitemap>",
    `    <loc>${xmlEscape(`${SITE_URL}/blog-sitemap.xml`)}</loc>`,
    `    <lastmod>${xmlEscape(toIsoDate(lastmod))}</lastmod>`,
    "  </sitemap>",
    "  <sitemap>",
    `    <loc>${xmlEscape(`${SITE_URL}/faq-sitemap.xml`)}</loc>`,
    `    <lastmod>${xmlEscape(toIsoDate(lastmod))}</lastmod>`,
    "  </sitemap>",
    "  <sitemap>",
    `    <loc>${xmlEscape(`${SITE_URL}/image-sitemap.xml`)}</loc>`,
    `    <lastmod>${xmlEscape(toIsoDate(lastmod))}</lastmod>`,
    "  </sitemap>",
    "  <sitemap>",
    `    <loc>${xmlEscape(`${SITE_URL}/product-sitemap.xml`)}</loc>`,
    `    <lastmod>${xmlEscape(toIsoDate(lastmod))}</lastmod>`,
    "  </sitemap>",
    "  <sitemap>",
    `    <loc>${xmlEscape(`${SITE_URL}/sitemap.xml`)}</loc>`,
    `    <lastmod>${xmlEscape(toIsoDate(lastmod))}</lastmod>`,
    "  </sitemap>",
    "</sitemapindex>",
  ].join("\n");

const buildImageSitemapXml = (blogs = []) => {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ];

  lines.push("  <url>");
  lines.push(`    <loc>${xmlEscape(`${SITE_URL}/`)}</loc>`);
  lines.push("    <image:image>");
  lines.push(`      <image:loc>${xmlEscape(`${SITE_URL}/android-chrome-512x512.png`)}</image:loc>`);
  lines.push("      <image:title>SNIPCOL</image:title>");
  lines.push("      <image:caption>SNIPCOL protocol integration platform</image:caption>");
  lines.push("    </image:image>");
  lines.push("  </url>");

  for (const blog of blogs) {
    const imageUrl = blog?.featuredImage?.url;
    if (!blog?.slug || !imageUrl) continue;
    lines.push("  <url>");
    lines.push(`    <loc>${xmlEscape(`${SITE_URL}/blog/${blog.slug}`)}</loc>`);
    lines.push("    <image:image>");
    lines.push(`      <image:loc>${xmlEscape(imageUrl)}</image:loc>`);
    lines.push(`      <image:title>${xmlEscape(stripHtml(blog.title || "SNIPCOL Blog"))}</image:title>`);
    lines.push(
      `      <image:caption>${xmlEscape(stripHtml(blog.excerpt || blog.metaDescription || "Read this insightful article"))}</image:caption>`
    );
    lines.push("    </image:image>");
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  return lines.join("\n");
};

const buildFaqTxt = (faqs = []) => {
  const lines = ["# SNIPCOL FAQs", ""];
  for (const faq of faqs) {
    const slug = asFaqSlug(faq);
    lines.push(`Q: ${stripHtml(faq.question)}`);
    lines.push(`A: ${stripHtml(faq.answer)}`);
    lines.push(`URL: ${SITE_URL}/faqs/${slug}`);
    lines.push("");
  }
  return lines.join("\n").trim() + "\n";
};

const buildLlmsTxt = (blogs = [], faqs = []) => {
  const lines = [
    "# SNIPCOL",
    "",
    `> Canonical: ${SITE_URL}/`,
    `> Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
    "## Primary URLs",
    ...staticRoutes.map((route) => `- ${SITE_URL}${route.path}`),
    "",
    "## Latest Blog URLs",
    ...blogs.slice(0, 100).map((blog) => `- ${SITE_URL}/blog/${blog.slug}`),
    "",
    "## Latest FAQ URLs",
    ...faqs.slice(0, 200).map((faq) => `- ${SITE_URL}/faqs/${asFaqSlug(faq)}`),
    "",
  ];
  return lines.join("\n");
};

const buildLlmsFullMarkdown = (blogs = [], faqs = []) => {
  const lines = [
    "# SNIPCOL SEO and AI Index",
    "",
    `Canonical Site: ${SITE_URL}/`,
    `Primary Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
    "## Core Pages",
    ...staticRoutes.map((route) => `- ${SITE_URL}${route.path}`),
    "",
    "## Latest Blog URLs",
    ...blogs.slice(0, 200).map((blog) => `- ${SITE_URL}/blog/${blog.slug}`),
    "",
    "## Latest FAQ URLs",
    ...faqs.slice(0, 400).map((faq) => `- ${SITE_URL}/faqs/${asFaqSlug(faq)}`),
    "",
    "## SEO Notes",
    "- All URLs use canonical HTTPS paths.",
    "- Sitemap includes static pages, blogs, and FAQ detail pages.",
    "- FAQ URLs are slug-based for stable crawl paths.",
    "- Metadata and structured data are injected at page level.",
    "",
  ];
  return lines.join("\n");
};

const buildRobotsTxt = () =>
  [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /login/",
    "Disallow: /signup/",
    "Disallow: /admin-login/",
    "Disallow: /reset-password/",
    "Disallow: /verify-email/",
    "Disallow: /user/",
    "Disallow: /dashboard/",
    "Disallow: /api/",
    "",
    `Sitemap: ${SITE_URL}/sitemap-index.xml`,
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    `Sitemap: ${SITE_URL}/blog-sitemap.xml`,
    `Sitemap: ${SITE_URL}/faq-sitemap.xml`,
    `Sitemap: ${SITE_URL}/image-sitemap.xml`,
    `Sitemap: ${SITE_URL}/product-sitemap.xml`,
    `Sitemap: ${SITE_URL}/page-sitemap.xml`,
    "",
  ].join("\n");

const buildPlainUrlList = (pageEntries, blogEntries, faqEntries) =>
  [...pageEntries, ...blogEntries, ...faqEntries].map((entry) => entry.loc).join("\n") + "\n";

const buildBlogLinksTxt = (blogs) => blogs.map((blog) => `${SITE_URL}/blog/${blog.slug}`).join("\n") + "\n";
const buildFaqLinksTxt = (faqs) => faqs.map((faq) => `${SITE_URL}/faqs/${asFaqSlug(faq)}`).join("\n") + "\n";

const writeFileSafely = async (name, content) => {
  const filePath = path.join(OUTPUT_DIR, name);
  await fs.writeFile(filePath, content, "utf8");
};

const fetchSeoData = async () => {
  const [blogs, faqs] = await Promise.all([
    Blog.find(publishedBlogFilter)
      .select("slug title excerpt metaDescription featuredImage updatedAt publishedAt createdAt")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean(),
    FAQ.find(publishedFaqFilter).select("slug question answer updatedAt createdAt").sort({ updatedAt: -1, createdAt: -1 }).lean(),
  ]);
  return { blogs, faqs };
};

export const regenerateSeoAssetsNow = async (reason = "manual", logger = console) => {
  if (!AUTO_WRITE_ENABLED) {
    logger?.info?.(`[seo:auto] skipped (SEO_ASSETS_AUTO_WRITE=false), reason=${reason}`);
    return { skipped: true };
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const { blogs, faqs } = await fetchSeoData();
  const now = new Date().toISOString();

  const pageEntries = staticRoutes.map((route) => ({
    loc: `${SITE_URL}${route.path}`,
    lastmod: now,
    changefreq: route.changefreq,
    priority: route.priority,
  }));

  const blogEntries = blogs.map((blog) => ({
    loc: `${SITE_URL}/blog/${blog.slug}`,
    lastmod: blog.updatedAt || blog.publishedAt || blog.createdAt || now,
    changefreq: "weekly",
    priority: "0.8",
  }));

  const faqEntries = faqs.map((faq) => ({
    loc: `${SITE_URL}/faqs/${asFaqSlug(faq)}`,
    lastmod: faq.updatedAt || faq.createdAt || now,
    changefreq: "monthly",
    priority: "0.7",
  }));

  const completeEntries = [...pageEntries, ...blogEntries, ...faqEntries];

  await Promise.all([
    writeFileSafely("sitemap.xml", buildSitemapXml(completeEntries)),
    writeFileSafely("sitemap-index.xml", buildSitemapIndexXml(now)),
    writeFileSafely("page-sitemap.xml", buildSitemapXml(pageEntries)),
    writeFileSafely("blog-sitemap.xml", buildSitemapXml(blogEntries)),
    writeFileSafely("faq-sitemap.xml", buildSitemapXml(faqEntries)),
    writeFileSafely("image-sitemap.xml", buildImageSitemapXml(blogs)),
    writeFileSafely("product-sitemap.xml", buildEmptySitemapXml()),
    writeFileSafely("robots.txt", buildRobotsTxt()),
    writeFileSafely("faq.txt", buildFaqTxt(faqs)),
    writeFileSafely("llms.txt", buildLlmsTxt(blogs, faqs)),
    writeFileSafely("llms-full.md", buildLlmsFullMarkdown(blogs, faqs)),
    writeFileSafely("all-urls.txt", buildPlainUrlList(pageEntries, blogEntries, faqEntries)),
    writeFileSafely("blog-links.txt", buildBlogLinksTxt(blogs)),
    writeFileSafely("faq-links.txt", buildFaqLinksTxt(faqs)),
  ]);

  logger?.info?.(
    `[seo:auto] regenerated (${reason}) -> pages=${pageEntries.length}, blogs=${blogEntries.length}, faqs=${faqEntries.length}`
  );

  return { pages: pageEntries.length, blogs: blogEntries.length, faqs: faqEntries.length, outputDir: OUTPUT_DIR };
};

let regenerateTimer = null;
let isRegenerating = false;
let rerunNeeded = false;
let rerunReason = "coalesced";

const runQueuedRegeneration = async (reason, logger = console) => {
  if (isRegenerating) {
    rerunNeeded = true;
    rerunReason = reason || rerunReason;
    return;
  }

  isRegenerating = true;
  try {
    await regenerateSeoAssetsNow(reason, logger);
  } catch (error) {
    logger?.error?.(`[seo:auto] regeneration failed (${reason}): ${error.message}`);
  } finally {
    isRegenerating = false;
    if (rerunNeeded) {
      rerunNeeded = false;
      const nextReason = rerunReason;
      rerunReason = "coalesced";
      await runQueuedRegeneration(nextReason, logger);
    }
  }
};

export const scheduleSeoAssetsRegeneration = (reason = "update", logger = console) => {
  if (!AUTO_WRITE_ENABLED) return;
  if (regenerateTimer) clearTimeout(regenerateTimer);
  regenerateTimer = setTimeout(() => {
    regenerateTimer = null;
    void runQueuedRegeneration(reason, logger);
  }, 1500);
};
