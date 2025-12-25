import Blog from '../models/BlogModel.js';
import { v2 as cloudinary } from 'cloudinary';
import { appendBlogToSheet } from '../utils/googleSheetHelper.js';

// Ensure Cloudinary is configured
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper to upload a file buffer to Cloudinary
const uploadImageToCloudinary = async (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: 'blog_assets', 
        resource_type: 'auto',
        transformation: [
          { width: 1200, height: 630, crop: 'fill', quality: 'auto:good' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ public_id: result.public_id, url: result.secure_url });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Helper to process and upload a single image file from the request
const processImageUpload = async (file) => {
  if (!file) return null;
  return await uploadImageToCloudinary(file.buffer);
};

// @desc    Create a new blog post
// @route   POST /api/blogs
// @access  Private/Admin
export const createBlog = async (req, res) => {
  try {
    const data = JSON.parse(req.body.blogData);
    const files = req.files;

    if (files?.featuredImage) {
      data.featuredImage = await processImageUpload(files.featuredImage[0]);
    }

    const blog = await Blog.create(data);

    // ✅ Push to Google Sheet after successful creation
    appendBlogToSheet(blog);

    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all blog posts (with pagination and filtering)
// @route   GET /api/blogs
// @access  Public
export const getAllBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const category = req.query.category;
    const status = req.query.status || 'published';
    
    const query = { status };
    if (category && category !== 'all') {
      query.category = category;
    }

    const blogs = await Blog.find(query)
      .select('title slug excerpt author category featuredImage publishedAt readingTime tags')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Blog.countDocuments(query);
    
    res.status(200).json({ 
      success: true, 
      data: blogs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalBlogs: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get a single blog post by slug
// @route   GET /api/blogs/:slug
// @access  Public
export const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ 
      slug: req.params.slug, 
      status: 'published' 
    });
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get all blogs for admin (including drafts)
// @route   GET /api/blogs/admin
// @access  Private/Admin
export const getAllBlogsAdmin = async (req, res) => {
  try {
    const blogs = await Blog.find({})
      // ✅ Remove .select() to get ALL fields including content, metaTitle, metaDescription
      .sort({ updatedAt: -1 });
      
    res.status(200).json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update a blog post
// @route   PUT /api/blogs/:id
// @access  Private/Admin
export const updateBlog = async (req, res) => {
  try {
    const data = JSON.parse(req.body.blogData);
    const files = req.files;
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    // Handle featured image update
    if (files.featuredImage) {
      // Delete old image from Cloudinary if it exists
      if (blog.featuredImage && blog.featuredImage.public_id) {
        await cloudinary.uploader.destroy(blog.featuredImage.public_id);
      }
      data.featuredImage = await processImageUpload(files.featuredImage[0]);
    }

    const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: updatedBlog });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a blog post
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    // Delete featured image from Cloudinary
    if (blog.featuredImage && blog.featuredImage.public_id) {
      await cloudinary.uploader.destroy(blog.featuredImage.public_id);
    }
    
    await blog.deleteOne();
    res.status(200).json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get blog categories with count
// @route   GET /api/blogs/categories
// @access  Public
export const getBlogCategories = async (req, res) => {
  try {
    const categories = await Blog.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get related blogs
// @route   GET /api/blogs/:slug/related
// @access  Public
export const getRelatedBlogs = async (req, res) => {
  try {
    const currentBlog = await Blog.findOne({ slug: req.params.slug });
    if (!currentBlog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const relatedBlogs = await Blog.find({
      _id: { $ne: currentBlog._id },
      status: 'published',
      $or: [
        { category: currentBlog.category },
        { tags: { $in: currentBlog.tags } }
      ]
    })
    .select('title slug excerpt featuredImage category readingTime publishedAt')
    .limit(3)
    .sort({ publishedAt: -1 });

    res.status(200).json({ success: true, data: relatedBlogs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getAllKeywords = async (req, res) => {
  try {
    // Published blogs fetch karo aur keywords field select karo
    const blogs = await Blog.find({ status: 'published' }).select('keywords');

    // Sab keywords flatten karke unique karo
    const allKeywords = [...new Set(blogs.flatMap(blog => blog.keywords))];

    res.status(200).json({ success: true, data: allKeywords });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};




// @desc    Get blogs by a specific keyword
export const getBlogsByKeyword = async (req, res) => {
  try {
    const keyword = req.params.keyword;

    const blogs = await Blog.find({
      status: 'published',
      keywords: { $in: [keyword] } // <-- match keyword in array
    })
    .select('title slug excerpt author category featuredImage publishedAt readingTime tags keywords')
    .sort({ publishedAt: -1 });

    if (!blogs.length) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    res.status(200).json({ success: true, data: blogs });
  } catch (error) {
    console.error('Error fetching blogs by keyword:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
