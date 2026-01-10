// src/config/db.js
import mongoose from 'mongoose';
import { startAutoFixService } from '../scripts/autoFixBlogs.js'; // .js jaruri hai

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Auto-fix service start
    startAutoFixService();
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    process.exit(1); 
  }
};

export default connectDB;