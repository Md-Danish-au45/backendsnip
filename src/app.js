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

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

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
app.options('*', cors());

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
app.use('/api', mainRouter);

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

export default app;
