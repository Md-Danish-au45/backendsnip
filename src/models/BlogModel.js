import mongoose from 'mongoose';
import slugify from 'slugify';

const blogSchema = new mongoose.Schema(
  {
    // Basic Blog Information
    title: {
      type: String,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    excerpt: {
      type: String,
      required: [true, 'Please provide an excerpt'],
      maxlength: [300, 'Excerpt cannot exceed 300 characters']
    },
    content: {
      type: String,
    },
    author: {
      type: String,
      default: 'VerifyMyKyc Team',
    },
    category: {
      type: String,
      enum: [
  "Protocol Integration",
  "Industrial IoT (IIoT)",
  "Universal Connectivity",
  "Hardware Interoperability",
  "Smart Automation",
  "Legacy Systems",
  "Communication Standards",
  "Technical Tutorials",
  "Case Studies",
  "Hardware Security",
  "Edge Computing",
  "Implementation Guides",
  "Industry 4.0",
  "Device Management",
  "Product Updates"
]
    },
    keywords: {
      type: [String],

    },
    tags: [{
      type: String,
      trim: true
    }],
    
    // Images
    featuredImage: {
      public_id: String,
      url: String,
    },
    
    // SEO Fields
    metaTitle: String,
    metaDescription: String,
    
    // Publishing
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    },
    publishedAt: {
      type: Date,
      default: null
    },
    lastSyncedAt: {
      type: Date,
      default: null
    },
    readingTime: {
      type: Number, // in minutes
      default: 5
    }
  },
  {
    timestamps: true,
  }
);

// ✅ Middleware 1: For .save() and .create()
blogSchema.pre('save', function (next) {
  if (this.isModified('title') || this.isNew) {
    this.slug = slugify(this.title, { 
      lower: true, 
      strict: true, 
      remove: /[*+~.()'"!:@]/g 
    });
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Calculate reading time based on content length (average 200 words per minute)
  if (this.isModified('content')) {
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.max(1, Math.ceil(wordCount / 200));
  }
  
  next();
});

// ✅ Middleware 2: For .findOneAndUpdate() and .findByIdAndUpdate()
blogSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  
  
  // Check if title is being updated (check in both root and $set)
  const titleInRoot = update.title;
  const titleIn$set = update.$set?.title;
  
  if (titleInRoot || titleIn$set) {
    const newTitle = titleInRoot || titleIn$set;
    const newSlug = slugify(newTitle, { 
      lower: true, 
      strict: true, 
      remove: /[*+~.()'"!:@]/g 
    });
    
    
    // IMPORTANT: Directly modify the update object
    // If title is in root, set slug in root
    if (titleInRoot) {
      update.slug = newSlug;
    }
    
    // If title is in $set, set slug in $set
    if (titleIn$set) {
      if (!update.$set) {
        update.$set = {};
      }
      update.$set.slug = newSlug;
    }
    
  }
  
  next();
});

// Index for better query performance
blogSchema.index({ slug: 1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ publishedAt: -1 });

const Blog = mongoose.model('Blog', blogSchema);
export default Blog;