import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Blog from "../models/BlogModel.js";
import FAQ from "../models/faq.model.js";

const SITE_URL = (process.env.SITE_URL || "https://www.snipcol.com").replace(/\/+$/, "");
const BLOGS_PER_PAGE = 9;
const FAQS_PER_PAGE = 12;
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
  { path: "/ITOTIntegration", changefreq: "weekly", priority: "0.8" },
  { path: "/ProtocolHealthAudit", changefreq: "weekly", priority: "0.8" },
  { path: "/FireAlarm", changefreq: "weekly", priority: "0.8" },
  { path: "/RCverification", changefreq: "weekly", priority: "0.8" },
  { path: "/how-to-get-verify", changefreq: "monthly", priority: "0.7" },
  { path: "/case-study", changefreq: "monthly", priority: "0.7" },
  { path: "/videos/complete-verification-platform-demo", changefreq: "monthly", priority: "0.7" },
  { path: "/OurProtocolMission", changefreq: "monthly", priority: "0.8" },
  { path: "/ArchitectSupport", changefreq: "monthly", priority: "0.8" },
  { path: "/specs", changefreq: "monthly", priority: "0.8" },
  { path: "/blog", changefreq: "daily", priority: "0.9" },
  { path: "/sitemap", changefreq: "daily", priority: "0.8" },
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

const getLatestDateFromItems = (items = [], pickDate, fallback = new Date().toISOString()) => {
  let latest = 0;
  for (const item of items) {
    const candidate = new Date(pickDate(item) || 0).getTime();
    if (!Number.isNaN(candidate) && candidate > latest) latest = candidate;
  }
  return latest ? new Date(latest).toISOString() : fallback;
};

const buildBlogPaginationEntries = (blogs = [], fallbackLastmod = new Date().toISOString()) => {
  const totalPages = Math.ceil(blogs.length / BLOGS_PER_PAGE);
  if (totalPages <= 1) return [];

  const entries = [];
  for (let page = 2; page <= totalPages; page += 1) {
    const start = (page - 1) * BLOGS_PER_PAGE;
    const pageBlogs = blogs.slice(start, start + BLOGS_PER_PAGE);
    entries.push({
      loc: `${SITE_URL}/blog/page/${page}`,
      lastmod: getLatestDateFromItems(
        pageBlogs,
        (blog) => blog?.updatedAt || blog?.publishedAt || blog?.createdAt,
        fallbackLastmod
      ),
      changefreq: "daily",
      priority: "0.75",
    });
  }

  return entries;
};

const buildFaqPaginationEntries = (faqs = [], fallbackLastmod = new Date().toISOString()) => {
  const totalPages = Math.ceil(faqs.length / FAQS_PER_PAGE);
  if (totalPages <= 1) return [];

  const entries = [];
  for (let page = 2; page <= totalPages; page += 1) {
    const start = (page - 1) * FAQS_PER_PAGE;
    const pageFaqs = faqs.slice(start, start + FAQS_PER_PAGE);
    entries.push({
      loc: `${SITE_URL}/faqs/page/${page}`,
      lastmod: getLatestDateFromItems(pageFaqs, (faq) => faq?.updatedAt || faq?.createdAt, fallbackLastmod),
      changefreq: "weekly",
      priority: "0.75",
    });
  }

  return entries;
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
    `Sitemap: ${SITE_URL}/product-sitemap.xml`,
    `Sitemap: ${SITE_URL}/page-sitemap.xml`,
    "",
  ].join("\n");

const buildPlainUrlList = (pageEntries, blogEntries, faqEntries) =>
  [...pageEntries, ...blogEntries, ...faqEntries].map((entry) => entry.loc).join("\n") + "\n";

const buildBlogLinksTxt = (blogs, paginationEntries = []) =>
  [...paginationEntries.map((entry) => entry.loc), ...blogs.map((blog) => `${SITE_URL}/blog/${blog.slug}`)].join("\n") + "\n";
const buildFaqLinksTxt = (faqs, paginationEntries = []) =>
  [...paginationEntries.map((entry) => entry.loc), ...faqs.map((faq) => `${SITE_URL}/faqs/${asFaqSlug(faq)}`)].join("\n") + "\n";

const buildEntriesStructureJson = (pageEntries, blogs, faqs, generatedAt) =>
  JSON.stringify(
    {
      site: SITE_URL,
      generatedAt: toIsoDate(generatedAt),
      counts: {
        pages: pageEntries.length,
        blogs: blogs.length,
        faqs: faqs.length,
        total: pageEntries.length + blogs.length + faqs.length,
      },
      entries: {
        pages: pageEntries.map((entry) => ({
          type: "page",
          url: entry.loc,
          changefreq: entry.changefreq,
          priority: entry.priority,
          lastmod: toIsoDate(entry.lastmod),
        })),
        blogs: blogs.map((blog) => ({
          type: "blog",
          slug: blog.slug,
          url: `${SITE_URL}/blog/${blog.slug}`,
          title: stripHtml(blog.title || ""),
          updatedAt: toIsoDate(blog.updatedAt || blog.publishedAt || blog.createdAt),
        })),
        faqs: faqs.map((faq) => ({
          type: "faq",
          slug: asFaqSlug(faq),
          url: `${SITE_URL}/faqs/${asFaqSlug(faq)}`,
          question: stripHtml(faq.question || ""),
          updatedAt: toIsoDate(faq.updatedAt || faq.createdAt),
        })),
      },
    },
    null,
    2
  ) + "\n";

const buildSeoContentMarkdown = (blogs, faqs, generatedAt) => {
  const lines = [
    "# SNIPCOL SEO Content Hub",
    "",
    `Generated: ${toIsoDate(generatedAt)}`,
    `Canonical: ${SITE_URL}/`,
    "",
    "## Brand Summary",
    "SNIPCOL is a universal protocol integration platform for industrial automation, utility operations, smart building ecosystems and edge-cloud architectures.",
    "The platform is engineered for reliable protocol translation, secure data transfer and scalable deployment in enterprise environments.",
    "",
    "## Core SEO Pages",
    ...staticRoutes.map((route) => `- ${SITE_URL}${route.path}`),
    "",
    "## Latest Blog Highlights",
    ...blogs.slice(0, 100).map((blog) => `- ${stripHtml(blog.title || "")} (${SITE_URL}/blog/${blog.slug})`),
    "",
    "## Latest FAQ Highlights",
    ...faqs.slice(0, 200).map((faq) => `- ${stripHtml(faq.question || "")} (${SITE_URL}/faqs/${asFaqSlug(faq)})`),
    "",
    "## Technical SEO Notes",
    "- Canonical URLs are HTTPS.",
    "- XML sitemaps are generated automatically from live data.",
    "- LLM and machine-readable files are regenerated after blog/faq updates.",
    "",
  ];
  return lines.join("\n");
};

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

  const staticPageEntries = staticRoutes.map((route) => ({
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

  const blogPaginationEntries = buildBlogPaginationEntries(blogs, now);
  const faqPaginationEntries = buildFaqPaginationEntries(faqs, now);
  const pageEntries = [...staticPageEntries, ...blogPaginationEntries, ...faqPaginationEntries];
  const completeEntries = [...pageEntries, ...blogEntries, ...faqEntries];

  await Promise.all([
    writeFileSafely("sitemap.xml", buildSitemapXml(completeEntries)),
    writeFileSafely("sitemap-index.xml", buildSitemapIndexXml(now)),
    writeFileSafely("page-sitemap.xml", buildSitemapXml(pageEntries)),
    writeFileSafely("blog-sitemap.xml", buildSitemapXml([...blogPaginationEntries, ...blogEntries])),
    writeFileSafely("faq-sitemap.xml", buildSitemapXml([...faqPaginationEntries, ...faqEntries])),
    writeFileSafely("image-sitemap.xml", buildImageSitemapXml(blogs)),
    writeFileSafely("product-sitemap.xml", buildEmptySitemapXml()),
    writeFileSafely("robots.txt", buildRobotsTxt()),
    writeFileSafely("faq.txt", buildFaqTxt(faqs)),
    writeFileSafely("llms.txt", buildLlmsTxt(blogs, faqs)),
    writeFileSafely("llms-full.md", buildLlmsFullMarkdown(blogs, faqs)),
    writeFileSafely("seo-content.md", buildSeoContentMarkdown(blogs, faqs, now)),
    writeFileSafely("entries-structure.json", buildEntriesStructureJson(pageEntries, blogs, faqs, now)),
    writeFileSafely("all-urls.txt", buildPlainUrlList(pageEntries, blogEntries, faqEntries)),
    writeFileSafely("blog-links.txt", buildBlogLinksTxt(blogs, blogPaginationEntries)),
    writeFileSafely("faq-links.txt", buildFaqLinksTxt(faqs, faqPaginationEntries)),
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
