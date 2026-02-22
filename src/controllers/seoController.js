import Blog from "../models/BlogModel.js";
import FAQ from "../models/faq.model.js";
import { regenerateSeoAssetsNow } from "../utils/seoAssetsAutoGenerator.js";

const SITE_URL = (process.env.SITE_URL || "https://www.snipcol.com").replace(/\/+$/, "");
const BLOGS_PER_PAGE = 9;
const FAQS_PER_PAGE = 12;

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

const xmlEscape = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const toIsoDate = (dateLike) => {
  const date = new Date(dateLike || Date.now());
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

const cleanText = (value = "") =>
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

const buildUrlNode = ({ loc, lastmod, changefreq = "weekly", priority = "0.7" }) => [
  "  <url>",
  `    <loc>${xmlEscape(loc)}</loc>`,
  `    <lastmod>${xmlEscape(toIsoDate(lastmod))}</lastmod>`,
  `    <changefreq>${xmlEscape(changefreq)}</changefreq>`,
  `    <priority>${xmlEscape(priority)}</priority>`,
  "  </url>",
].join("\n");

const buildSitemapXmlFromEntries = (entries = []) =>
  [XML_HEADER, '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...entries.map(buildUrlNode), "</urlset>"].join(
    "\n"
  );

const buildStaticPageEntries = (lastmod = new Date().toISOString()) =>
  staticRoutes.map((route) => ({
    loc: `${SITE_URL}${route.path}`,
    lastmod,
    changefreq: route.changefreq,
    priority: route.priority,
  }));

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

const buildBlogEntries = (blogs = [], fallbackLastmod = new Date().toISOString()) =>
  blogs
    .filter((blog) => blog?.slug)
    .map((blog) => ({
      loc: `${SITE_URL}/blog/${blog.slug}`,
      lastmod: blog.updatedAt || blog.publishedAt || blog.createdAt || fallbackLastmod,
      changefreq: "weekly",
      priority: "0.8",
    }));

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

const buildFaqEntries = (faqs = [], fallbackLastmod = new Date().toISOString()) =>
  faqs
    .map((faq) => {
      const slug = faq?.slug || toSeoSlug(faq?.question);
      if (!slug) return null;
      return {
        loc: `${SITE_URL}/faqs/${slug}`,
        lastmod: faq.updatedAt || faq.createdAt || fallbackLastmod,
        changefreq: "monthly",
        priority: "0.7",
      };
    })
    .filter(Boolean);

const buildPageEntries = ({ blogs = [], faqs = [], fallbackLastmod = new Date().toISOString() }) => [
  ...buildStaticPageEntries(fallbackLastmod),
  ...buildBlogPaginationEntries(blogs, fallbackLastmod),
  ...buildFaqPaginationEntries(faqs, fallbackLastmod),
];

const buildSitemapXml = ({ blogs = [], faqs = [] }) => {
  const nowIso = new Date().toISOString();
  const entries = [
    ...buildPageEntries({ blogs, faqs, fallbackLastmod: nowIso }),
    ...buildBlogEntries(blogs, nowIso),
    ...buildFaqEntries(faqs, nowIso),
  ];
  return buildSitemapXmlFromEntries(entries);
};

const buildEmptySitemapXml = () =>
  [XML_HEADER, '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', "</urlset>"].join("\n");

const buildSitemapIndexXml = (lastmod = new Date().toISOString()) =>
  [
    XML_HEADER,
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <sitemap>",
    `    <loc>${xmlEscape(`${SITE_URL}/sitemap.xml`)}</loc>`,
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
    `    <loc>${xmlEscape(`${SITE_URL}/page-sitemap.xml`)}</loc>`,
    `    <lastmod>${xmlEscape(toIsoDate(lastmod))}</lastmod>`,
    "  </sitemap>",
    "  <sitemap>",
    `    <loc>${xmlEscape(`${SITE_URL}/product-sitemap.xml`)}</loc>`,
    `    <lastmod>${xmlEscape(toIsoDate(lastmod))}</lastmod>`,
    "  </sitemap>",
    "</sitemapindex>",
  ].join("\n");

const buildImageSitemapXml = (blogs = []) => {
  const lines = [
    XML_HEADER,
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
    lines.push(`      <image:title>${xmlEscape(cleanText(blog.title || "SNIPCOL Blog"))}</image:title>`);
    lines.push(
      `      <image:caption>${xmlEscape(cleanText(blog.excerpt || blog.metaDescription || "SNIPCOL technical blog"))}</image:caption>`
    );
    lines.push("    </image:image>");
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  return lines.join("\n");
};

const fetchSeoData = async () => {
  const [blogs, faqs] = await Promise.all([
    Blog.find(publishedBlogFilter)
      .select("slug title excerpt metaDescription featuredImage publishedAt updatedAt createdAt")
      .sort({ updatedAt: -1 })
      .lean(),
    FAQ.find({ $or: [{ isPublished: true }, { isPublished: { $exists: false } }, { isPublished: null }] })
      .select("slug question answer updatedAt createdAt")
      .sort({ updatedAt: -1 })
      .lean(),
  ]);

  return { blogs, faqs };
};

const buildEntriesStructureJson = ({ blogs = [], faqs = [] }) => {
  const generatedAt = new Date().toISOString();
  const pageEntries = buildPageEntries({ blogs, faqs, fallbackLastmod: generatedAt });

  return (
    JSON.stringify(
      {
        site: SITE_URL,
        generatedAt,
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
            title: cleanText(blog.title || ""),
            updatedAt: toIsoDate(blog.updatedAt || blog.publishedAt || blog.createdAt),
          })),
          faqs: faqs.map((faq) => {
            const slug = faq.slug || toSeoSlug(faq.question);
            return {
              type: "faq",
              slug,
              url: `${SITE_URL}/faqs/${slug}`,
              question: cleanText(faq.question || ""),
              updatedAt: toIsoDate(faq.updatedAt || faq.createdAt),
            };
          }),
        },
      },
      null,
      2
    ) + "\n"
  );
};

const buildSeoContentMarkdown = ({ blogs = [], faqs = [] }) => {
  const lines = [
    "# SNIPCOL SEO Content Hub",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Canonical: ${SITE_URL}/`,
    "",
    "## Brand Summary",
    "SNIPCOL is a universal protocol integration platform for industrial automation, utility environments, smart building operations and edge-cloud interoperability.",
    "The platform focuses on secure data exchange, protocol translation and deployment-ready implementation architecture.",
    "",
    "## Core SEO Pages",
    ...staticRoutes.map((route) => `- ${SITE_URL}${route.path}`),
    "",
    "## Latest Blog Highlights",
    ...blogs.slice(0, 100).map((blog) => `- ${cleanText(blog.title || "")} (${SITE_URL}/blog/${blog.slug})`),
    "",
    "## Latest FAQ Highlights",
    ...faqs.slice(0, 200).map((faq) => `- ${cleanText(faq.question || "")} (${SITE_URL}/faqs/${faq.slug || toSeoSlug(faq.question)})`),
    "",
  ];
  return lines.join("\n");
};

const setXmlResponseHeaders = (res) => {
  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=900, s-maxage=900");
};

export const serveSitemapXml = async (_req, res) => {
  try {
    const seoData = await fetchSeoData();
    const xml = buildSitemapXml(seoData);

    setXmlResponseHeaders(res);
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate sitemap",
      error: error.message,
    });
  }
};

export const servePageSitemapXml = async (_req, res) => {
  try {
    const seoData = await fetchSeoData();
    const xml = buildSitemapXmlFromEntries(
      buildPageEntries({
        blogs: seoData.blogs,
        faqs: seoData.faqs,
        fallbackLastmod: new Date().toISOString(),
      })
    );
    setXmlResponseHeaders(res);
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate page sitemap",
      error: error.message,
    });
  }
};

export const serveBlogSitemapXml = async (_req, res) => {
  try {
    const { blogs } = await fetchSeoData();
    const nowIso = new Date().toISOString();
    const xml = buildSitemapXmlFromEntries([...buildBlogPaginationEntries(blogs, nowIso), ...buildBlogEntries(blogs, nowIso)]);
    setXmlResponseHeaders(res);
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate blog sitemap",
      error: error.message,
    });
  }
};

export const serveFaqSitemapXml = async (_req, res) => {
  try {
    const { faqs } = await fetchSeoData();
    const nowIso = new Date().toISOString();
    const xml = buildSitemapXmlFromEntries([...buildFaqPaginationEntries(faqs, nowIso), ...buildFaqEntries(faqs, nowIso)]);
    setXmlResponseHeaders(res);
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate faq sitemap",
      error: error.message,
    });
  }
};

export const serveProductSitemapXml = async (_req, res) => {
  try {
    const xml = buildEmptySitemapXml();
    setXmlResponseHeaders(res);
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate product sitemap",
      error: error.message,
    });
  }
};

export const serveSitemapIndexXml = async (_req, res) => {
  try {
    const xml = buildSitemapIndexXml(new Date().toISOString());
    setXmlResponseHeaders(res);
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate sitemap index",
      error: error.message,
    });
  }
};

export const serveImageSitemapXml = async (_req, res) => {
  try {
    const { blogs } = await fetchSeoData();
    const xml = buildImageSitemapXml(blogs);
    setXmlResponseHeaders(res);
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate image sitemap",
      error: error.message,
    });
  }
};

export const serveFaqText = async (_req, res) => {
  try {
    const faqs = await FAQ.find({ $or: [{ isPublished: true }, { isPublished: { $exists: false } }, { isPublished: null }] })
      .select("question answer slug updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    const lines = ["# SNIPCOL FAQ", `# Source: ${SITE_URL}/faqs`, ""];

    for (const faq of faqs) {
      const slug = faq.slug || toSeoSlug(faq.question);
      lines.push(`Q: ${cleanText(faq.question)}`);
      lines.push(`A: ${cleanText(faq.answer)}`);
      lines.push(`URL: ${SITE_URL}/faqs/${slug}`);
      lines.push("");
    }

    res.set("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(lines.join("\n").trim() + "\n");
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate faq.txt",
      error: error.message,
    });
  }
};

export const serveLlmsText = async (_req, res) => {
  try {
    const { blogs, faqs } = await fetchSeoData();
    const pageEntries = buildPageEntries({ blogs, faqs, fallbackLastmod: new Date().toISOString() });
    const lines = [
      "# SNIPCOL",
      "",
      `> Canonical: ${SITE_URL}/`,
      `> Sitemap: ${SITE_URL}/sitemap.xml`,
      "",
      "## Primary Pages",
      ...pageEntries.map((entry) => `- ${entry.loc}`),
      "",
      "## Latest Blog URLs",
      ...blogs.slice(0, 50).map((blog) => `- ${SITE_URL}/blog/${blog.slug}`),
      "",
      "## Latest FAQ URLs",
      ...faqs.slice(0, 100).map((faq) => `- ${SITE_URL}/faqs/${faq.slug || toSeoSlug(faq.question)}`),
      "",
    ];

    res.set("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(lines.join("\n"));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate llms.txt",
      error: error.message,
    });
  }
};

export const serveLlmsFullMarkdown = async (_req, res) => {
  try {
    const { blogs, faqs } = await fetchSeoData();
    const pageEntries = buildPageEntries({ blogs, faqs, fallbackLastmod: new Date().toISOString() });
    const lines = [
      "# SNIPCOL Full AI Index",
      "",
      `Canonical: ${SITE_URL}/`,
      `Sitemap: ${SITE_URL}/sitemap.xml`,
      "",
      "## Core Pages",
      ...pageEntries.map((entry) => `- ${entry.loc}`),
      "",
      "## Blog URLs",
      ...blogs.map((blog) => `- ${SITE_URL}/blog/${blog.slug}`),
      "",
      "## FAQ URLs",
      ...faqs.map((faq) => `- ${SITE_URL}/faqs/${faq.slug || toSeoSlug(faq.question)}`),
      "",
    ];

    res.set("Content-Type", "text/markdown; charset=utf-8");
    return res.status(200).send(lines.join("\n"));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate llms-full.md",
      error: error.message,
    });
  }
};

export const serveAllUrlsText = async (_req, res) => {
  try {
    const { blogs, faqs } = await fetchSeoData();
    const pageEntries = buildPageEntries({ blogs, faqs, fallbackLastmod: new Date().toISOString() });
    const lines = [
      ...pageEntries.map((entry) => entry.loc),
      ...blogs.map((blog) => `${SITE_URL}/blog/${blog.slug}`),
      ...faqs.map((faq) => `${SITE_URL}/faqs/${faq.slug || toSeoSlug(faq.question)}`),
    ];

    res.set("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(lines.join("\n") + "\n");
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate all-urls.txt",
      error: error.message,
    });
  }
};

export const serveEntriesStructureJson = async (_req, res) => {
  try {
    const seoData = await fetchSeoData();
    const content = buildEntriesStructureJson(seoData);
    res.set("Content-Type", "application/json; charset=utf-8");
    res.set("Cache-Control", "no-store, max-age=0");
    return res.status(200).send(content);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate entries-structure.json",
      error: error.message,
    });
  }
};

export const serveSeoContentMarkdown = async (_req, res) => {
  try {
    const seoData = await fetchSeoData();
    const content = buildSeoContentMarkdown(seoData);
    res.set("Content-Type", "text/markdown; charset=utf-8");
    return res.status(200).send(content);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate seo-content.md",
      error: error.message,
    });
  }
};

export const regenerateSeoAssets = async (req, res) => {
  try {
    const reason = String(req?.body?.reason || "manual-ui").trim() || "manual-ui";
    const result = await regenerateSeoAssetsNow(reason, console);

    return res.status(200).json({
      success: true,
      reason,
      generatedAt: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to regenerate SEO assets",
      error: error.message,
    });
  }
};
