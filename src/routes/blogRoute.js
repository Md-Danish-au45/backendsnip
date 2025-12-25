import express from 'express';
import {
  createBlog,
  getAllBlogs,
  getAllBlogsAdmin,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  getBlogCategories,
  getRelatedBlogs,
  getAllKeywords,
  getBlogsByKeyword,
} from '../controllers/blogController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Define the fields for multer to handle file uploads
const blogImageFields = [
  { name: 'featuredImage', maxCount: 1 }
];

// Public routes
router.get('/', getAllBlogs);
router.get('/categories', getBlogCategories);
router.get('/:slug', getBlogBySlug);
router.get('/:slug/related', getRelatedBlogs);

// Admin routes
router.get('/admin/all', protect, authorize('admin'), getAllBlogsAdmin);
router.post('/', protect, authorize('admin'), upload.fields(blogImageFields), createBlog);
router.put('/:id', protect, authorize('admin'), upload.fields(blogImageFields), updateBlog);
router.delete('/:id', protect, authorize('admin'), deleteBlog);


// Public routes
router.get('/keywords', getAllKeywords); // All unique keywords
router.get('/by-keyword/:keyword', getBlogsByKeyword); // Blogs for a keyword

export default router;