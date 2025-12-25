
import express from 'express';
import {
  getUserTransactions,
  getAllTransactions,
  getServiceUsageStats,
  getUserServiceUsage, // Import the new controller function
} from '../controllers/transactionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import Transaction from '../models/TransactionModel.js';

const router = express.Router();

// Get transactions for the currently logged-in user
router.route('/me').get(protect, getUserTransactions);

// Get a user's service usage stats (for admins or the user themselves)
router.route('/usage').get(protect, getUserServiceUsage);

//  Admin Routes 

// Get all transactions in the system
router.route('/admin/all').get(protect,  authorize('admin'),getAllTransactions);

// Get revenue statistics for subscription sales
router.route('/admin/stats').get(protect, authorize('admin'), getServiceUsageStats);


// router.delete('/admin/delete-all',protect, authorize('admin'), async (req, res, next) => {
//   try {
//     const result = await Transaction.deleteMany({});
//     res.status(200).json({
//       success: true,
//       message: 'All transactions deleted successfully',
//       deletedCount: result.deletedCount
//     });
//   } catch (error) {
//     next(error);
//   }
// });

export default router;