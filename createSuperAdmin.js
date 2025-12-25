// createSuperAdmin.js (in project root)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Debug: Check if UserModel file exists
const userModelPath = join(__dirname, 'src', 'models', 'UserModel.js');


// List files in models directory
const modelsDir = join(__dirname, 'src', 'models');
if (fs.existsSync(modelsDir)) {
  const files = fs.readdirSync(modelsDir);
} else {
  console.log('Models directory does not exist');
}

// Try dynamic import based on what we find
let User;
try {
  if (fs.existsSync(userModelPath)) {
    User = (await import('./src/models/UserModel.js')).default;
  } else {
    // Try alternative names
    const altPaths = [
      './src/models/User.js',
      './src/models/userModel.js',
      './src/models/user.js'
    ];
    
    for (const path of altPaths) {
      try {
        User = (await import(path)).default;
        break;
      } catch (e) {
        console.log('❌ Failed to import from:', path);
      }
    }
  }
} catch (error) {
  console.error('Error importing User model:', error.message);
  process.exit(1);
}

if (!User) {
  console.error('❌ Could not find User model');
  process.exit(1);
}

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error('❌ Missing MONGODB_URI or DATABASE_URL or MONGO_URI in environment variables');
      process.exit(1);
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Super Admin credentials from environment variables
    const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
    const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
    const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME || 'Super Administrator';

    // Validate required environment variables
    if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
      console.error('❌ Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD in environment variables');
      console.error('\nAdd these to your .env file');
      process.exit(1);
    }
    
    // Check if Super Admin already exists
    const existingAdmin = await User.findOne({ 
      email: SUPER_ADMIN_EMAIL,
      role: 'admin' 
    });

    if (existingAdmin) {
      console.log('⚠️ Super Admin with this email already exists:');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('Creating Super Admin...');

    // Create Super Admin using the same method as your register function
    const superAdmin = await User.create({
      name: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      role: 'admin',
      isVerified: true
    });

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

// Execute the function
createSuperAdmin();