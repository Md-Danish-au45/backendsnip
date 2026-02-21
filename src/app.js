import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import mainRouter from './routes/index.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import cron from 'node-cron';

import { syncAllBlogsToSheet } from './utils/googleSheetHelper.js';
import SyncLog from './models/SyncLogModel.js';
import { startAutoFixService } from './scripts/autoFixBlogs.js';
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
  serveSeoContentMarkdown,
  serveSitemapIndexXml,
  serveSitemapXml,
} from './controllers/seoController.js';
import { regenerateSeoAssetsNow } from './utils/seoAssetsAutoGenerator.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const cronAuthSecret = process.env.CRON_SECRET || process.env.SEO_CRON_SECRET || '';

const isAuthorizedCronCall = (req) => {
  const authHeader = req.get('authorization');
  const userAgent = String(req.get('user-agent') || '').toLowerCase();
  const vercelCronHeader = String(req.get('x-vercel-cron') || '').toLowerCase();
  const isVercelCronRequest = userAgent.includes('vercel-cron/1.0') || vercelCronHeader === '1';

  if (cronAuthSecret) {
    return authHeader === `Bearer ${cronAuthSecret}` || isVercelCronRequest;
  }

  return isVercelCronRequest;
};

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS configuration
const allowedOrigins = [
  'https://www.snipcol.com',
  'https://snipcol.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
}));

// ✅ ADD THIS — PRE-FLIGHT FIX
app.use(cors());

// External API CORS + rate limiting
app.use('/api/external', cors({
  origin: '*',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
  credentials: false
}));

const externalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this API key, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.header('X-API-Key') || req.ip
});

app.use('/api/external', externalApiLimiter);

// Mount main routes
app.get('/sitemap.xml', serveSitemapXml);
app.get('/sitemap-index.xml', serveSitemapIndexXml);
app.get('/page-sitemap.xml', servePageSitemapXml);
app.get('/blog-sitemap.xml', serveBlogSitemapXml);
app.get('/faq-sitemap.xml', serveFaqSitemapXml);
app.get('/product-sitemap.xml', serveProductSitemapXml);
app.get('/image-sitemap.xml', serveImageSitemapXml);
app.get('/faq.txt', serveFaqText);
app.get('/llms.txt', serveLlmsText);
app.get('/llms-full.md', serveLlmsFullMarkdown);
app.get('/all-urls.txt', serveAllUrlsText);
app.get('/entries-structure.json', serveEntriesStructureJson);
app.get('/seo-content.md', serveSeoContentMarkdown);
app.get('/internal/cron/seo-regenerate', async (req, res) => {
  if (!isAuthorizedCronCall(req)) {
    return res.status(401).json({ success: false, message: 'Unauthorized cron request' });
  }

  try {
    const result = await regenerateSeoAssetsNow('vercel-cron', console);
    return res.status(200).json({ success: true, reason: 'vercel-cron', ...result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to regenerate SEO assets',
      error: error.message,
    });
  }
});
app.use('/api', mainRouter);

// Generate static SEO assets once on boot (if output path exists/enabled).
void regenerateSeoAssetsNow("startup", console).catch((error) => {
  console.error("[seo:auto] startup generation failed:", error.message);
});

// Custom error handler
app.use(errorHandler);

//////////////////////////////
// ✅ CRON JOB: Daily Blog Sync
//////////////////////////////

// Runs every day at 2 AM server time
cron.schedule("0 2 * * *", async () => {
  console.log("🕑 Running full blog sync...");

  try {
    await syncAllBlogsToSheet();

    // Retry failed logs automatically
    const failedLogs = await SyncLog.find({ status: 'fail' });
    if (failedLogs.length > 0) {
      console.log(`🔄 Retrying ${failedLogs.length} failed blog syncs...`);
      for (const log of failedLogs) {
        const blog = await import('./models/BlogModel.js').then(m => m.default.findById(log.blogId));
        if (!blog) continue;

        const result = await syncAllBlogsToSheet(blog);
        if (result) {
          log.status = 'success';
          log.errorMessage = '';
        }
        await log.save();
        await new Promise(res => setTimeout(res, 500)); // rate limit
      }
    }

    console.log("🎉 Blog sync cron completed!");
  } catch (err) {
    console.error("❌ Cron job failed:", err.message);
  }
});

// Safety sync every 30 minutes so XML/TXT files remain fresh even if hooks were skipped.
cron.schedule("*/30 * * * *", async () => {
  try {
    await regenerateSeoAssetsNow("cron:30m", console);
  } catch (error) {
    console.error("[seo:auto] periodic sync failed:", error.message);
  }
});

export default app;
