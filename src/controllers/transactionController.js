
import Transaction from '../models/TransactionModel.js';
import User from '../models/UserModel.js'; 

/**
 * @desc    Get transactions for the logged-in user (paginated)
 * @route   GET /api/transactions/me
 * @access  Private
 */
export const getUserTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Transaction.countDocuments({ user: req.user.id });
    
    const transactions = await Transaction.find({ user: req.user.id })
      .populate('user', 'name email')    
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: transactions.length,
      pagination: { total, page, limit },
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all transactions (admin only)
 * @route   GET /api/transactions/admin/all
 * @access  Private/Admin
 */
export const getAllTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: transactions.length, data: transactions });
  } catch (error)
 {
    next(error);
  }
};

/**
 * @desc    Get aggregated category purchase REVENUE statistics (admin only)
 * @route   GET /api/transactions/admin/stats
 * @access  Private/Admin
 */
export const getServiceUsageStats = async (req, res, next) => {
  try {
    const stats = await Transaction.aggregate([
      {
        $match: { status: 'completed' } // Only count successful purchases
      },
      {
        $group: {
          _id: '$category', // Group by category name
          purchaseCount: { $sum: 1 },
          totalRevenue: { $sum: '$amount' }
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          purchaseCount: '$purchaseCount',
          totalRevenue: '$totalRevenue',
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
    ]);

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a user's individual service USAGE counts from their profile
 * @route   GET /api/transactions/usage
 * @access  Private
 */
export const getUserServiceUsage = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('usedServices activeSubscriptions');

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }


        const usageData = {
            servicesUsed: user.usedServices,
            subscriptionStatus: user.activeSubscriptions,
        };

        res.status(200).json({
            success: true,
            data: usageData,
        });

    } catch (error) {
        next(error);
    }
};