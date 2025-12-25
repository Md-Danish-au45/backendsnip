import mongoose from "mongoose";
import dotenv from "dotenv";
import Blog from "./src/models/BlogModel.js";
import { syncAllBlogsToSheet } from "./src/utils/googleSheetHelper.js";

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB Connected");

  const blogs = await Blog.find({ status: "published" });
  console.log(`🟦 Found ${blogs.length} blogs`);

  for (let blog of blogs) {
    if (!blog.content) continue;

    let html = blog.content;

    html = html.replace(/<a\b[^>]*>(.*?)<\/a>/gi, "$1");
    html = html.replace(/https?:\/\/[^\s<"]+/gi, "");
    html = html.replace(/text-decoration\s*:\s*underline;?/gi, "");
    html = html.replace(/color\s*:\s*#[0-9a-fA-F]{3,6};?/gi, "");
    html = html.replace(/color\s*:\s*rgb\([^)]+\);?/gi, "");
    html = html.replace(/color\s*:\s*rgba\([^)]+\);?/gi, "");
    html = html.replace(/<\/?u>/gi, "");

    blog.content = html;
    await blog.save();
  }

  console.log("🧹 Blogs cleaned. Now syncing to Google Sheet...\n");

  await syncAllBlogsToSheet();

  console.log("🎉 CLEAN + SYNC DONE");
  process.exit(0);
};

run();
