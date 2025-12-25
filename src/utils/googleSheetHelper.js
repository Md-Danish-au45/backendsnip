import { google } from "googleapis";
import fs from "fs";
import path from "path";
import Blog from "../models/BlogModel.js";
import SyncLog from "../models/SyncLogModel.js";

// Fix for ESM __dirname
const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

// Absolute path to service account key
const credentialsPath = path.join(__dirname, "..", "..", "vefdoc-9397cd3c240f.json");
const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));

// Google Sheets scopes
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const SHEET_ID = "1U0NgUzRES8Rl4S4b41d964tBNUw00IAPNIAjYAFVsOU"; // Only the ID

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});

// ---------------------------------------------------------
// 1️⃣ Fetch ALL existing slugs from Google Sheet
// ---------------------------------------------------------
export const getExistingSheetData = async () => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A:P",
    });

    const rows = response.data.values || [];

    const titles = rows.slice(1).map(row => row[0]?.trim()?.toLowerCase());
    const slugs = rows.slice(1).map(row => row[1]?.trim()?.toLowerCase());

    return { titles, slugs };
  } catch (error) {
    console.error("❌ Error reading sheet:", error.message);
    return { titles: [], slugs: [] };
  }
};


// ---------------------------------------------------------
// 2️⃣ Append blog to Google Sheet
// ---------------------------------------------------------
export const appendBlogToSheet = async (blog) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const values = [[
      blog.title || "Untitled Blog",
      blog.slug || "",
      blog.author || "VerifyMyKyc Team",
      blog.category || "General",
      blog.status || "draft",
      blog.publishedAt ? new Date(blog.publishedAt).toLocaleString() : "",
      `https://verifymykcy.com/blog/${blog.slug}`,
      blog.excerpt || "",
      blog.content || "",
      blog.readingTime || 5,
      blog.tags ? blog.tags.join(", ") : "",
      blog.keywords ? blog.keywords.join(", ") : "",
      blog.metaTitle || "",
      blog.metaDescription || "",
      blog.featuredImage?.url || "",
      blog.createdAt ? new Date(blog.createdAt).toLocaleString() : "",
      blog.updatedAt ? new Date(blog.updatedAt).toLocaleString() : ""
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A:P",
      valueInputOption: "USER_ENTERED",
      resource: { values },
    });

    console.log(`✅ Blog "${blog.title}" synced to Google Sheet.`);
    return true;
  } catch (err) {
    console.error(`❌ Google Sheet sync failed for "${blog.title}":`, err.message);
    return err;
  }
};

// ---------------------------------------------------------
// 3️⃣ Sync ALL blogs to Google Sheet (NO DUPLICATES EVER)
// ---------------------------------------------------------
export const syncAllBlogsToSheet = async () => {
  try {
    console.log("⏳ Fetching all published blogs...");
    const blogs = await Blog.find({ status: "published" });

    console.log("⏳ Fetching existing sheet data...");
    const { titles: sheetTitles, slugs: sheetSlugs } = await getExistingSheetData();

    let successCount = 0;
    let skippedCount = 0;

    for (const blog of blogs) {
      const titleLower = blog.title.trim().toLowerCase();
      const slugLower = blog.slug.trim().toLowerCase();

      // 1️⃣ Skip if TITLE already exists
      if (sheetTitles.includes(titleLower)) {
        console.log(`⛔ SKIPPED (Duplicate Title): ${blog.title}`);
        skippedCount++;
        continue;
      }

      // 2️⃣ Skip if SLUG already exists
      if (sheetSlugs.includes(slugLower)) {
        console.log(`⛔ SKIPPED (Duplicate Slug): ${blog.slug}`);
        skippedCount++;
        continue;
      }

      // 3️⃣ Skip if already synced before
      const alreadySynced = await SyncLog.findOne({
        blogId: blog._id,
        status: "success"
      });

      if (alreadySynced) {
        console.log(`⛔ SKIPPED (Already Synced): ${blog.title}`);
        skippedCount++;
        continue;
      }

      // 4️⃣ Append to sheet
      const result = await appendBlogToSheet(blog);

      if (result === true) {
        successCount++;

        await SyncLog.create({
          blogId: blog._id,
          title: blog.title,
          status: "success",
        });
      } else {
        await SyncLog.create({
          blogId: blog._id,
          title: blog.title,
          status: "fail",
          errorMessage: result?.message || "Unknown error",
        });
      }

      await new Promise(res => setTimeout(res, 300));
    }

    console.log(
      `🎉 DONE! Synced: ${successCount}, Skipped: ${skippedCount}, Total Blogs: ${blogs.length}`
    );

  } catch (error) {
    console.error("❌ Sync failed:", error.message);
  }
};
