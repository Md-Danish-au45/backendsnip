import mongoose from 'mongoose';
import dotenv from 'dotenv';
// --- FIX: Corrected the path to point inside the 'src' directory ---
import PricingPlan from './src/models/PricingModel.js';

dotenv.config();

// --- Zaroori Plans Ka Data (The correct structure) ---
const plansToSeed = [
    {
        name: "Personal",
         monthly: { price: 6000, limitPerMonth: 150 }, // 40 * 150
        yearly: { price: 40000, limitPerMonth: 1000 }, 
        monthStartDate: 1,
        includedServices: [],
    },
    {
        name: "Professional",
        monthly: { price: 11250, limitPerMonth: 150 }, // 75 * 150
        yearly: { price: 75000, limitPerMonth: 1000 }, // 75 * 1000
        monthStartDate: 1,
        includedServices: [],
    },
    {
        name: "Enterprise",
       monthly: { price: 29850, limitPerMonth: 150 }, // 199 * 150
        yearly: { price: 199000, limitPerMonth: 1000 }, // 199 * 1000
        monthStartDate: 1,
        includedServices: [],
    },
];

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in your .env file.');
        }
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

const seedDatabase = async () => {
    await connectDB();

    try {
        console.log('Upserting main pricing plans...');

        // --- FIX: Use findOneAndUpdate with upsert to either update existing plans or create new ones ---
        for (const planData of plansToSeed) {
            await PricingPlan.findOneAndUpdate(
                { name: planData.name }, // Find a plan by its name
                planData,                // The data to update with
                { upsert: true, new: true, runValidators: true } // Options: upsert creates if not found
            );
            console.log(`Plan "${planData.name}" was successfully created or updated.`);
        }

        console.log('Database seeding process completed successfully!');

    } catch (error) {
        console.error('Error during database seeding:', error);
    } finally {
        // Close the connection
        mongoose.connection.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    }
};

// Run the seeding function
seedDatabase();

