import mongoose from "mongoose";
import dotenv from "dotenv";
import { syncAllBlogsToSheet } from "../utils/googleSheetHelper.js";

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

const runSync = async () => {
  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected.");

    await syncAllBlogsToSheet();

    process.exit(0);
  } catch (err) {
    console.error("❌ Error during sync:", err.message);
    process.exit(1);
  }
};

runSync();
