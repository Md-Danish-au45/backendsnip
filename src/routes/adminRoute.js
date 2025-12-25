import express from 'express';
import { check } from 'express-validator';
import { register, login, getAdminDashboard ,getAllAdmin, deleteAdmin} from '../controllers/adminController.js';
import { protect, authorize, protectAdmin } from '../middleware/authMiddleware.js'; // Import new middleware
import { deleteUser } from '../controllers/userController.js';
import { adminListAllApiKeys, adminRegenerateUserApiKey, adminSuspendApiKey, adminViewApiLogs } from '../controllers/adminApiKeyController.js';
const router = express.Router();

// // Public route for an admin to log in. The controller handles the role check.
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  login
);

// // This route to create new admins is now protected and can only be accessed by existing admins.
router.post(
  '/register',
  protect, // First, ensure user is logged in
  authorize('admin'), // Then, ensure user has 'admin' role
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  ],
  register
);
router.get(
  '/all',
  protect, // First, ensure user is logged in
  authorize('admin'), // Then, ensure user has 'admin' role
  getAllAdmin
);
router.delete(
  '/:id', 
  protect, 
  authorize('admin'), // Added missing authorization
  deleteAdmin
);
// // Protected and Authorized admin dashboard route
router.get('/dashboard', protect, authorize('admin'), getAdminDashboard);
router.delete(
  '/:id', 
  protect, 
  deleteUser
);

// Base path from frontend: /api/admin/api-keys
router.get('/api-keys', 
  protect, 
  authorize('admin'), // Use authorize middleware for admin access
  adminListAllApiKeys
);

router.post('/api-keys/suspend/:userId', 
  protect, 
  authorize('admin'), 
  adminSuspendApiKey
);

router.post('/api-keys/regenerate/:userId', 
  protect, 
  authorize('admin'), 
  adminRegenerateUserApiKey
);

router.get('/api-keys/logs/:userId', 
  protect, 
  authorize('admin'), 
  adminViewApiLogs
);
// router.get("/list", protect, adminListAllApiKeys);
// router.post("/suspend/:userId", protect, adminSuspendApiKey);
// router.post("/regenerate/:userId", protect, adminRegenerateUserApiKey);
// router.get("/logs/:userId", protect, adminViewApiLogs);

// router.get('/admin/api-keys', protect, protectAdmin, adminListAllApiKeys);
// router.post('/admin/api-keys/suspend/:userId', protect, protectAdmin, adminSuspendApiKey);
export default router