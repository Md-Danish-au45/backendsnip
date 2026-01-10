// src/scripts/autoFixBlogs.js
// ✅ Automatically fixes blogs inserted from n8n with null values

import Blog from '../models/BlogModel.js'; // ← .js extension jaruri hai ES modules ke liye

/**
 * Background service to auto-fix blogs with null/missing values
 * Runs every 30 seconds to check for new unfixed blogs
 */
export const startAutoFixService = () => {
  console.log('🔧 Auto-fix service started for n8n blogs');

  // Run immediately on startup
  fixNullBlogs();

  // Then run every 30 seconds
  setInterval(async () => {
    await fixNullBlogs();
  }, 30000); // 30 seconds
};

/**
 * Fixes all blogs with null/missing critical fields
 */
export const fixNullBlogs = async () => {
  try {
    // Find all blogs with null or missing fields OR malformed featuredImage
    const blogsToFix = await Blog.find({
      $or: [
        { status: null },
        { status: { $exists: false } },
        { category: null },
        { category: '' },
        { author: null },
        { author: '' },
        { publishedAt: null },
        { createdAt: null },
        { updatedAt: null },
        // 🔥 Check for missing or incomplete featuredImage
        { featuredImage: { $exists: false } },
        { featuredImage: null },
        { 'featuredImage.url': { $exists: false } },
        { 'featuredImage.url': null },
        { 'featuredImage.url': '' },
        { 'featuredImage.public_id': { $exists: false } },
        { 'featuredImage.public_id': null }
      ]
    });

    if (blogsToFix.length === 0) {
      return; // No blogs to fix
    }

    console.log(`🔍 Found ${blogsToFix.length} blogs to fix`);

    // Fix each blog
    let fixedCount = 0;
    for (const blog of blogsToFix) {
      const updates = {};

      // Fix status
      if (!blog.status || blog.status === null) {
        updates.status = 'published';
      }

      // Fix category
      if (!blog.category || blog.category === null || blog.category === '') {
        updates.category = 'General';
      }

      // Fix author
      if (!blog.author || blog.author === null || blog.author === '') {
        updates.author = 'snipcol Team';
      }

      // Fix publishedAt
      if (!blog.publishedAt || blog.publishedAt === null) {
        updates.publishedAt = blog.createdAt || new Date();
      }

      // Fix createdAt
      if (!blog.createdAt || blog.createdAt === null) {
        updates.createdAt = new Date();
      }

      // Fix updatedAt
      if (!blog.updatedAt || blog.updatedAt === null) {
        updates.updatedAt = new Date();
      }

      // Fix readingTime
      if (!blog.readingTime || blog.readingTime === null) {
        if (blog.content) {
          const wordCount = blog.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
          updates.readingTime = Math.max(1, Math.ceil(wordCount / 200));
        } else {
          updates.readingTime = 5;
        }
      }

      // Fix excerpt if missing
      if (!blog.excerpt || blog.excerpt === null) {
        updates.excerpt = 'Read this insightful article';
      }

      // Fix metaTitle if missing
      if (!blog.metaTitle || blog.metaTitle === null) {
        updates.metaTitle = blog.title;
      }

      // Fix metaDescription if missing
      if (!blog.metaDescription || blog.metaDescription === null) {
        updates.metaDescription = blog.excerpt || 'Read this insightful article';
      }

      // 🔥 FIX FEATURED IMAGE - Handle all cases
      if (!blog.featuredImage || !blog.featuredImage.url) {
        // Case 1: featuredImage is completely missing or empty
        // Set a default placeholder or leave empty
        updates.featuredImage = {
          url: '', // Empty URL - frontend will show placeholder
          public_id: null
        };
      } else if (blog.featuredImage.url && typeof blog.featuredImage.url === 'string') {
        // Case 2: featuredImage exists but URL has extra spaces or missing public_id
        const cleanUrl = blog.featuredImage.url.trim();
        if (cleanUrl !== blog.featuredImage.url || !blog.featuredImage.public_id) {
          updates.featuredImage = {
            url: cleanUrl,
            public_id: blog.featuredImage.public_id || null
          };
        }
      }

      // Update the blog
      await Blog.findByIdAndUpdate(blog._id, { $set: updates });
      fixedCount++;
      
      console.log(`✅ Fixed: ${blog.title}`);
    }

    console.log(`✨ Successfully fixed ${fixedCount} blogs`);
  } catch (error) {
    console.error('❌ Error in auto-fix service:', error.message);
  }
};