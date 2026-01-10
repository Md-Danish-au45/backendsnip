import mongoose from 'mongoose';
import slugify from 'slugify';

const blogSchema = new mongoose.Schema(
  {
    // Basic Blog Information
    title: {
      type: String,
      trim: true,
      required: [true, 'Title is required']
    },
    slug: {
      type: String,
      unique: true,
    },
    excerpt: {
      type: String,
      default: '',
      maxlength: [300, 'Excerpt cannot exceed 300 characters']
    },
    content: {
      type: String,
      required: [true, 'Content is required']
    },
    author: {
      type: String,
      default: 'snipcol Team',
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
        "Product Updates",
        "General", // Added default category
        "" // Allow empty string for backward compatibility
      ],
      default: 'General'
    },
    keywords: {
      type: [String],
      default: []
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
      default: 'published' // Changed from 'draft' to 'published'
    },
    publishedAt: {
      type: Date,
      default: Date.now // Auto-set to current date
    },
    lastSyncedAt: {
      type: Date,
      default: null
    },
    readingTime: {
      type: Number,
      default: 5
    }
  },
  {
    timestamps: true,
  }
);

// ✅ Middleware 1: For .save() and .create()
blogSchema.pre('save', function (next) {
  // Generate slug from title
  if (this.isModified('title') || this.isNew) {
    this.slug = slugify(this.title, { 
      lower: true, 
      strict: true, 
      remove: /[*+~.()'"!:@]/g 
    });
  }
  
  // 🔥 Handle null/empty category
  if (!this.category || this.category === null || this.category === '') {
    this.category = 'General';
  }
  
  // 🔥 Handle null/empty author
  if (!this.author || this.author === null || this.author === '') {
    this.author = 'snipcol Team';
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // 🔥 If publishedAt is null and status is published, set it
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Calculate reading time based on content length
  if (this.isModified('content') && this.content) {
    const wordCount = this.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    this.readingTime = Math.max(1, Math.ceil(wordCount / 200));
  }
  
  next();
});

// ✅ Middleware 2: For .findOneAndUpdate() and .findByIdAndUpdate()
blogSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  
  // Check if title is being updated
  const titleInRoot = update.title;
  const titleIn$set = update.$set?.title;
  
  if (titleInRoot || titleIn$set) {
    const newTitle = titleInRoot || titleIn$set;
    const newSlug = slugify(newTitle, { 
      lower: true, 
      strict: true, 
      remove: /[*+~.()'"!:@]/g 
    });
    
    // Set slug in the appropriate location
    if (titleInRoot) {
      update.slug = newSlug;
    }
    
    if (titleIn$set) {
      if (!update.$set) {
        update.$set = {};
      }
      update.$set.slug = newSlug;
    }
  }
  
  // 🔥 Handle category updates
  if (update.$set?.category === null || update.$set?.category === '') {
    update.$set.category = 'General';
  }
  
  // 🔥 Handle author updates
  if (update.$set?.author === null || update.$set?.author === '') {
    update.$set.author = 'snipcol Team';
  }
  
  // 🔥 Handle publishedAt for status changes
  if (update.$set?.status === 'published' && !update.$set.publishedAt) {
    update.$set.publishedAt = new Date();
  }
  
  next();
});

// ✅ Middleware 3: For .insertMany() - Handles bulk inserts from n8n
blogSchema.pre('insertMany', function (next, docs) {
  if (docs && docs.length) {
    docs.forEach(doc => {
      // Generate slug if missing
      if (!doc.slug && doc.title) {
        doc.slug = slugify(doc.title, { 
          lower: true, 
          strict: true, 
          remove: /[*+~.()'"!:@]/g 
        });
      }
      
      // 🔥 Fix null/empty status
      if (!doc.status || doc.status === null) {
        doc.status = 'published';
      }
      
      // 🔥 Fix null/empty category
      if (!doc.category || doc.category === null || doc.category === '') {
        doc.category = 'General';
      }
      
      // 🔥 Fix null/empty author
      if (!doc.author || doc.author === null || doc.author === '') {
        doc.author = 'snipcol Team';
      }
      
      // 🔥 Fix null publishedAt
      if (!doc.publishedAt || doc.publishedAt === null) {
        doc.publishedAt = new Date();
      }
      
      // 🔥 Fix null createdAt
      if (!doc.createdAt || doc.createdAt === null) {
        doc.createdAt = new Date();
      }
      
      // 🔥 Fix null updatedAt
      if (!doc.updatedAt || doc.updatedAt === null) {
        doc.updatedAt = new Date();
      }
      
      // Calculate reading time if content exists
      if (doc.content && (!doc.readingTime || doc.readingTime === null)) {
        const wordCount = doc.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
        doc.readingTime = Math.max(1, Math.ceil(wordCount / 200));
      }
    });
  }
  next();
});

// Index for better query performance
blogSchema.index({ slug: 1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ publishedAt: -1 });
blogSchema.index({ createdAt: -1 });

const Blog = mongoose.model('Blog', blogSchema);
export default Blog;