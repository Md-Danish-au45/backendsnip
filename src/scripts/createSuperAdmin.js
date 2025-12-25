// scripts/createSuperAdmin.js
import mongoose from 'mongoose';
import User from '../models/UserModel';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
    console.log('Connected to MongoDB');

    // Super Admin credentials - Change these values
    const SUPER_ADMIN_EMAIL = 'superadmin@yourapp.com';
    const SUPER_ADMIN_PASSWORD = 'SuperAdmin@123';
    const SUPER_ADMIN_NAME = 'Super Administrator';

    // Check if Super Admin already exists
    const existingAdmin = await User.findOne({ 
      email: SUPER_ADMIN_EMAIL,
      role: 'admin' 
    });

    if (existingAdmin) {
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create Super Admin using the same method as your register function
    const superAdmin = await User.create({
      name: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      role: 'admin',
      isVerified: true
    });
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createSuperAdmin();
}

export default createSuperAdmin;