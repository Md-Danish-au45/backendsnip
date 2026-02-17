import Blog from "../models/BlogModel.js";
import FAQ from "../models/faq.model.js";

const SITE_URL = (process.env.SITE_URL || "https://www.snipcol.com").replace(/\/+$/, "");

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

const cleanText = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const staticRoutes = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/blog", changefreq: "daily", priority: "0.9" },
  { path: "/faqs", changefreq: "weekly", priority: "0.9" },
  { path: "/about-us", changefreq: "monthly", priority: "0.7" },
  { path: "/contact-us", changefreq: "monthly", priority: "0.7" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.4" },
  { path: "/terms-and-condition", changefreq: "yearly", priority: "0.4" },
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

const buildSitemapXml = ({ blogs = [], faqs = [] }) => {
  const nowIso = new Date().toISOString();
  const nodes = [];

  for (const route of staticRoutes) {
    nodes.push(
      buildUrlNode({
        loc: `${SITE_URL}${route.path}`,
        lastmod: nowIso,
        changefreq: route.changefreq,
        priority: route.priority,
      })
    );
  }

  for (const blog of blogs) {
    if (!blog.slug) continue;

    nodes.push(
      buildUrlNode({
        loc: `${SITE_URL}/blog/${blog.slug}`,
        lastmod: blog.updatedAt || blog.publishedAt || blog.createdAt || nowIso,
        changefreq: "weekly",
        priority: "0.8",
      })
    );
  }

  for (const faq of faqs) {
    if (!faq.slug) continue;

    nodes.push(
      buildUrlNode({
        loc: `${SITE_URL}/faqs/${faq.slug}`,
        lastmod: faq.updatedAt || faq.createdAt || nowIso,
        changefreq: "monthly",
        priority: "0.7",
      })
    );
  }

  return [XML_HEADER, '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...nodes, "</urlset>"].join(
    "\n"
  );
};

const fetchSeoData = async () => {
  const [blogs, faqs] = await Promise.all([
    Blog.find(publishedBlogFilter)
      .select("slug publishedAt updatedAt createdAt")
      .sort({ updatedAt: -1 })
      .lean(),
    FAQ.find({ isPublished: true })
      .select("slug question answer updatedAt createdAt")
      .sort({ updatedAt: -1 })
      .lean(),
  ]);

  return { blogs, faqs };
};

export const serveSitemapXml = async (_req, res) => {
  try {
    const seoData = await fetchSeoData();
    const xml = buildSitemapXml(seoData);

    res.set("Content-Type", "application/xml; charset=utf-8");
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate sitemap",
      error: error.message,
    });
  }
};

export const serveFaqText = async (_req, res) => {
  try {
    const faqs = await FAQ.find({ isPublished: true })
      .select("question answer slug updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    const lines = ["# SNIPCOL FAQ", `# Source: ${SITE_URL}/faqs`, ""];

    for (const faq of faqs) {
      lines.push(`Q: ${cleanText(faq.question)}`);
      lines.push(`A: ${cleanText(faq.answer)}`);
      lines.push(`URL: ${SITE_URL}/faqs/${faq.slug || ""}`);
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
    const lines = [
      "# SNIPCOL",
      "",
      `> Canonical: ${SITE_URL}/`,
      `> Sitemap: ${SITE_URL}/sitemap.xml`,
      "",
      "## Primary Pages",
      `- Home: ${SITE_URL}/`,
      `- Blog Index: ${SITE_URL}/blog`,
      `- FAQ Index: ${SITE_URL}/faqs`,
      "",
      "## Latest Blog URLs",
      ...blogs.slice(0, 50).map((blog) => `- ${SITE_URL}/blog/${blog.slug}`),
      "",
      "## Latest FAQ URLs",
      ...faqs.slice(0, 100).map((faq) => `- ${SITE_URL}/faqs/${faq.slug}`),
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

