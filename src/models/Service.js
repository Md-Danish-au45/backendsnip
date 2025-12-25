// models/Service.js

import mongoose from 'mongoose';

const FieldSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please provide a field name'] },
  label: { type: String, required: [true, 'Please provide a user-friendly label'] },
  type: { type: String, required: [true, 'Please specify the field type'], enum: ['text', 'number', 'file', 'date', 'string', 'object', 'array','boolean'] },
  placeholder: { type: String, required: false },
}, { _id: false });


const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Please provide a service name'], trim: true },
    service_key: { type: String, required: [true, 'Please provide a unique service key'], unique: true, trim: true },
    
    // Multiple services can belong to the same category.
    category: {
      type: String,
      // required is now handled by the pre-save hook below
    },
    maxMonthlyUsage: {
  type: Number,
  default: 15   // default limit
},


    // New subcategory field
    subcategory: {
      type: String,
      required: false, // Not strictly required, but used in validation
      trim: true,
    },
    
    description: { type: String, required: [true, 'Please provide a service description'] },
    imageUrl: { type: String, required: false },
    price: { type: Number, required: [true, 'Please set a price for the service'], min: 0 },
    
    combo_price: {
      monthly: { type: Number, required: [true, 'Please set a monthly price'], min: 0 },
      yearly: { type: Number},
    },
// 👇 New Field: Developer API Pricing
    api_price: {
      per_request: { type: Number, required: false, min: 0 }, // e.g., ₹0.50 per API call
      monthly: { type: Number, required: false, min: 0 },     // e.g., ₹499 per month
    },
    
    is_active: { type: Boolean, default: true },
    globalUsageCount: { type: Number, default: 0 },
    endpoint: { type: String, required: [true, 'Please provide the API endpoint path'], trim: true },
    apiType: { type: String, required: [true, 'Please specify the API type'], enum: ['json', 'form'], default: 'json' },
    inputFields: { type: [FieldSchema], default: [] },
    outputFields: { type: [FieldSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to ensure either category or subcategory is present
ServiceSchema.pre('save', function(next) {
  // If both category and subcategory are missing (or are empty strings after trim)
  if (!this.category && !this.subcategory) {
    return next(new Error('A service must have either a category or a subcategory.'));
  }
  
  // If category is missing but subcategory is present, set category to an empty string
  if (!this.category) {
    this.category = '';
  }

  next();
});

const Service = mongoose.model('Service', ServiceSchema);
export default Service;