// routes/userRoutes.js

import express from 'express';
import { 
    getUserProfile, 
    getAllUsers, 
    promoteUserCategory,
    demoteUserCategory,
    sendSubscriptionReminder,
    updateUserProfile,
    getUserById,
    extendSubscription,
    revokeSubscription,
    subscribeToNewsletter,
    updateUserAvatar,
    promoteUserToSubcategory, 
    deleteUser,
    activateUser,
    deactivateUser,
    updateUserFlags,

    // ⭐ NEW IMPORTS
    getVerificationCredits,
    addVerificationCredits,
    updateVerificationCredits
} from '../controllers/userController.js';
    import { migrateVerificationCredits } from "../controllers/userController.js";

import { check } from 'express-validator';
import { protect ,authorize } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js'; 

const router = express.Router();

// ----------------------------------------------------------------------
// USER PROFILE
// ----------------------------------------------------------------------
router.get('/profile', protect, getUserProfile);

router.put(
    '/profile/avatar', 
    protect,
    upload.single('avatar'), 
    updateUserAvatar
);

router.put(
    '/profile',
    [ check('name', 'Name is required').not().isEmpty() ],
    protect,
    updateUserProfile
);

// ----------------------------------------------------------------------
// ⭐ NEW ROUTES FOR VERIFICATION CREDITS
// ----------------------------------------------------------------------
router.get('/verification-credits', protect, getVerificationCredits);
router.post('/admin/add-credits', protect, authorize('admin'), addVerificationCredits);

// ----------------------------------------------------------------------
// GENERAL USER MANAGEMENT
// ----------------------------------------------------------------------
router.route('/all').get(protect, authorize('admin'), getAllUsers);

router.route('/:userId/send-reminder')
    .post(protect, authorize('admin'), sendSubscriptionReminder);

router.route('/:userId')
    .get(protect, authorize('admin'), getUserById)
    .delete(protect, authorize('admin'), deleteUser);

router.post('/newsletter-subscribe', subscribeToNewsletter);

// ----------------------------------------------------------------------
// PROMOTION / DEMOTION
// ----------------------------------------------------------------------
router.route('/:userId/promote')
    .post(protect, authorize('admin'), promoteUserCategory);

router.route('/:userId/demote')
    .post(protect, authorize('admin'), demoteUserCategory);

router.route('/admin/promote-subcategory')
    .post(protect, authorize('admin'), promoteUserToSubcategory);

// ----------------------------------------------------------------------
// SUBSCRIPTION MANAGEMENT
// ----------------------------------------------------------------------
router.route('/admin/extend-subscription')
    .post(protect, authorize('admin'), extendSubscription);

router.route('/admin/revoke-subscription')
    .post(protect, authorize('admin'), revokeSubscription);

// ----------------------------------------------------------------------
// USER ACTIVATION / DEACTIVATION
// ----------------------------------------------------------------------
router.route('/admin/activate/:userId')
    .put(protect, authorize('admin'), activateUser);

router.route('/admin/deactivate/:userId')
    .put(protect, authorize('admin'), deactivateUser);

router.route('/admin/flags/:userId')
    .put(protect, authorize('admin'), updateUserFlags);


router.post(
  "/admin/update-credits",
  protect,
  authorize("admin"),
  updateVerificationCredits
);

router.get("/admin/migrate-credits", protect, authorize("admin"), migrateVerificationCredits);

export default router;
