
import User from "../models/UserModel.js";
import sendEmail from "../utils/sendEmail.js";
import { validationResult } from 'express-validator';
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '../utils/cloudinary.js';
import Service from "../models/Service.js";
// @desc    Get user profile (current logged-in user)
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isVerified: user.isVerified,
      promotedCategories: user.promotedCategories,
      activeSubscriptions: user.activeSubscriptions,
      usedServices: user.usedServices,
      role: user.role,
      createdAt: user.createdAt,
      password: !!user.password // Send a boolean indicating if a password is set
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

export const promoteUserToSubcategory = async (req, res, next) => {
    try {
        const { userId, subcategory, multiplier } = req.body;
        const promotionMultiplier = parseInt(multiplier, 10) || 1; 
        
        if (!userId || !subcategory) {
            res.status(400);
            throw new Error('User ID and subcategory are required.');
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404);
            throw new Error('User not found.');
        }

        const servicesInSubcategory = await Service.find({ subcategory: subcategory });
        if (servicesInSubcategory.length === 0) {
            res.status(404);
            throw new Error(`No services found for subcategory: '${subcategory}'`);
        }

        const usageLimit = servicesInSubcategory.length * promotionMultiplier;
        const now = new Date();
        const expiresAt = new Date(new Date().setMonth(now.getMonth() + 1));

        // Remove existing subscriptions for this subcategory
        user.activeSubscriptions = user.activeSubscriptions.filter(s => s.category !== subcategory);
        
        // ✅ CRITICAL: Manage promotions array
        // Initialize promotions array if it doesn't exist
        if (!user.promotions) {
            user.promotions = [];
        }
        
        // Find existing promotion index
        const existingPromoIndex = user.promotions.findIndex(p => p.category === subcategory);
        
        if (existingPromoIndex > -1) {
            // Update existing promotion
            user.promotions[existingPromoIndex].multiplier = promotionMultiplier;
            user.promotions[existingPromoIndex].expiresAt = expiresAt;
            user.promotions[existingPromoIndex].createdAt = now;
        } else {
            // Add new promotion
            user.promotions.push({
                category: subcategory,
                multiplier: promotionMultiplier,
                createdAt: now,
                expiresAt: expiresAt
            });
        }

    const realCategory = servicesInSubcategory[0].category;
const realServiceKey = servicesInSubcategory[0].service_key;

user.activeSubscriptions.push({
     category: service.category,   // Financial
   subcategory: service.subcategory, // Business Check
   serviceKey: service.service_key,  // gst_business_check
    planType: 'promotional',
    usageLimit: usageLimit,
    purchasedAt: now,
    expiresAt: expiresAt,
    isPromotion: true,
});


        // Add to promotedCategories if not present
        if (!user.promotedCategories.includes(subcategory)) {
            user.promotedCategories.push(subcategory);
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: `User ${user.name} promoted successfully for subcategory ${subcategory}.`,
            data: user,
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get all users (Admin)
// @route   GET /api/users/all
// @access  Private/Admin
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single user by ID (Admin)
// @route   GET /api/users/:userId
// @access  Private/Admin
export const getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId).select('-password'); // Exclude password hash

        if (!user) {
            res.status(404);
            throw new Error('User not found.');
        }

        // Return the full user object, including subscriptions, used services, etc.
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            mobile: user.mobile, // Include mobile if exists
            isVerified: user.isVerified,
            promotedCategories: user.promotedCategories,
            activeSubscriptions: user.activeSubscriptions,
            usedServices: user.usedServices,
            role: user.role,
            createdAt: user.createdAt,
            password: !!user.password, // Indicate if a password is set (for Google sign-in users)
        });

    } catch (error) {
        next(error);
    }
};


// @desc    Update user profile (current logged-in user)
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
    const errors = validationResult(req);
    const userId = req.user ? req.user._id : null;
   

    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authorized, no user ID provided.' });
        }

        const { name, email } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (name) user.name = name;
        if (email) user.email = email;

        const updatedUser = await user.save();

        res.status(200).json({
            success: true,
            data: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                isVerified: updatedUser.isVerified,
                
                promotedCategories: updatedUser.promotedCategories,
                activeSubscriptions: updatedUser.activeSubscriptions, 
                usedServices: updatedUser.usedServices,
                role: updatedUser.role,
                createdAt: updatedUser.createdAt,
                password: !!updatedUser.password // Boolean for password status
            }
        });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};


// @desc    Promote/Demote users
export const promoteUserCategory = async (req, res, next) => {
    try {
        const { category } = req.body;
        if (!category) {
            res.status(400);
            throw new Error('Category is required');
        }

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $addToSet: { promotedCategories: category } },
            { new: true, runValidators: true }
        );

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        res.status(200).json({
            success: true,
            message: `User ${user.name} promoted for category ${category}.`,
            data: user.promotedCategories,
        });

    } catch (error) {
        next(error);
    }
};

export const demoteUserCategory = async (req, res, next) => {
    try {
        const { category } = req.body;
        if (!category) {
            res.status(400);
            throw new Error('Category is required');
        }

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $pull: { promotedCategories: category } },
            { new: true }
        );

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        res.status(200).json({
            success: true,
            message: `User ${user.name} demoted from category ${category}.`,
            data: user.promotedCategories,
        });

    } catch (error) {
        next(error);
    }
};

export const sendSubscriptionReminder = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            res.status(404);
            throw new Error('User not found.');
        }

        if (!user.activeSubscriptions || user.activeSubscriptions.length === 0) {
            res.status(400);
            throw new Error('This user does not have any active subscriptions.');
        }

        const sortedSubscriptions = user.activeSubscriptions.sort(
            (a, b) => a.expiresAt - b.expiresAt
        );
        const nextExpiringSub = sortedSubscriptions[0];
        
        const now = new Date();
        if (nextExpiringSub.expiresAt < now) {
             res.status(400);
             throw new Error(`This user's subscription for "${nextExpiringSub.category}" already expired on ${nextExpiringSub.expiresAt.toDateString()}.`);
        }

        const expiresInDays = Math.ceil((nextExpiringSub.expiresAt - now) / (1000 * 60 * 60 * 24));

        const subject = `Your Subscription for "${nextExpiringSub.category}" is Expiring Soon!`;
        const text = `Hi ${user.name},\n\n` +
                     `This is a friendly reminder that your ${nextExpiringSub.planType} subscription for the "${nextExpiringSub.category}" category is set to expire in ${expiresInDays} day(s) on ${nextExpiringSub.expiresAt.toDateString()}.\n\n` +
                     `To ensure uninterrupted access to our services, please renew your subscription at your earliest convenience.\n\n` +
                     `Thank you for being a valued member!\n` +
                     `The Team`;

        const html = `<p>Hi ${user.name},</p>` +
                     `<p>This is a friendly reminder that your <strong>${nextExpiringSub.planType}</strong> subscription for the <strong>"${nextExpiringSub.category}"</strong> category is set to expire in <strong>${expiresInDays} day(s)</strong> on ${nextExpiringSub.expiresAt.toDateString()}.</p>` +
                     `<p>To ensure uninterrupted access to our services, please renew your subscription at your earliest convenience.</p>` +
                     `<p>Thank you for being a valued member!<br>The Team</p>`;
        
        await sendEmail({
            to: user.email,
            subject: subject,
            text: text,
            html: html
        });

        res.status(200).json({
            success: true,
            message: `Subscription reminder for "${nextExpiringSub.category}" has been successfully sent to ${user.email}.`
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Extend a user's subscription (Admin)
 * @route   POST /api/users/admin/extend-subscription
 * @access  Private/Admin
 */
export const extendSubscription = async (req, res, next) => {
    try {
        const { userId, category, duration } = req.body;

        if (!userId || !category || !duration || typeof duration.value !== 'number' || !['months', 'days', 'years'].includes(duration.unit)) {
            res.status(400);
            throw new Error('User ID, category, and valid duration (value, unit) are required.');
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404);
            throw new Error('User not found.');
        }

        const subIndex = user.activeSubscriptions.findIndex(s => s.category === category);
        if (subIndex === -1) {
            res.status(404);
            throw new Error('User does not have an active paid subscription for this category.');
        }

        const currentExpiry = user.activeSubscriptions[subIndex].expiresAt;
        const newExpiry = new Date(currentExpiry);

        if (duration.unit === 'months') {
            newExpiry.setMonth(newExpiry.getMonth() + duration.value);
        } else if (duration.unit === 'days') {
            newExpiry.setDate(newExpiry.getDate() + duration.value);
        } else if (duration.unit === 'years') {
            newExpiry.setFullYear(newExpiry.getFullYear() + duration.value);
        } else {
            res.status(400);
            throw new Error('Invalid duration unit specified. Must be "months", "days", or "years".');
        }
        // Ensure the new expiry date is not in the past
        if (newExpiry < currentExpiry) {
             res.status(400);
             throw new Error('New expiry date cannot be earlier than current expiry date. Ensure the extension duration is positive.');
        }


        user.activeSubscriptions[subIndex].expiresAt = newExpiry;
        await user.save();

        res.status(200).json({
            success: true,
            message: `Subscription for ${category} extended successfully. New expiry: ${newExpiry.toDateString()}`,
            data: user.activeSubscriptions,
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Revoke a user's subscription or promotion (Admin)
 * @route   POST /api/users/admin/revoke-subscription
 * @access  Private/Admin
 */
export const revokeSubscription = async (req, res, next) => {
    try {
        const { userId, category } = req.body;

        if (!userId || !category) {
            res.status(400);
            throw new Error('User ID and category are required.');
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $pull: {
                    activeSubscriptions: { category: category },
                    promotedCategories: category,
                    promotions: { category: category }, // ✅ ADD THIS LINE
                },
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: `All access for category "${category}" has been revoked for user ${updatedUser.name}.`,
            data: {
                activeSubscriptions: updatedUser.activeSubscriptions,
                promotedCategories: updatedUser.promotedCategories,
                promotions: updatedUser.promotions, // ✅ ADD THIS LINE
            }
        });

    } catch (error) {
        next(error);
    }
};
export const subscribeToNewsletter = async (req, res) => {
  const { email } = req.body;

  //  Basic validation
  if (!email) {
    res.status(400);
    throw new Error('Email is required.');
  }

  //  Find the user by email
  const user = await User.findOne({ email });

  if (!user) {
    res.status(200).json({
    message: 'Thank you for subscribing to our newsletter!',
    email,
  });
  }

  //  Check if already subscribed
  if (user.isSubscribedToNewsletter) {
    res.status(409);
    throw new Error('This email is already subscribed to our newsletter.');
  }

  //  Update only the newsletter subscription field
  await User.updateOne({ email }, { $set: { isSubscribedToNewsletter: true } });

  //  Send success response
  res.status(200).json({
    message: 'Thank you for subscribing to our newsletter!',
    email,
  });
};


// @desc    Update user avatar
// @route   PUT /api/users/profile/avatar
// @access  Private
export const updateUserAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    if (!req.file) {
      res.status(400); 
      throw new Error('No image file uploaded');
    }

    // If user already has an avatar, delete it from Cloudinary
    if (user.avatar) {
      const publicId = getPublicIdFromUrl(user.avatar);
      await deleteFromCloudinary(publicId);
    }

    // Upload new avatar to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'avatars');
    
    user.avatar = result.secure_url;
   
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: user.avatar,
    });
  } catch (error) {
    next(error);
  }
};
export const deleteUser = async (req, res, next) => {
    try {
        // req.params.userId का उपयोग करें जो URL से ID लेता है
        const user = await User.findByIdAndDelete(req.params.userId); 

        if (!user) {
            res.status(404);
            throw new Error('User not found.'); 
        }

        // 200 (OK) या 204 (No Content) status भेजें
        res.status(200).json({ 
            success: true, 
            message: `User ${user.name} deleted successfully.` 
        });

    } catch (error) {
        next(error); 
    }
};



// One-time migration script - backend mein temporary route banao
export const migrateUserPromotions = async (req, res, next) => {
    try {
        const users = await User.find({ 
            promotedCategories: { $exists: true, $ne: [] } 
        });
        
        let migrated = 0;
        
        for (const user of users) {
            // Initialize promotions array if not exists
            if (!user.promotions) {
                user.promotions = [];
            }
            
            // For each promoted category, create a promotion entry
            for (const category of user.promotedCategories) {
                // Find the subscription for this category
                const sub = user.activeSubscriptions.find(s => s.category === category && s.isPromotion);
                
                if (sub) {
                    // Check if promotion already exists
                    const existingPromo = user.promotions.find(p => p.category === category);
                    
                    if (!existingPromo) {
                        // Calculate multiplier from usageLimit
                        const services = await Service.find({ subcategory: category });
                        const multiplier = services.length > 0 ? Math.floor(sub.usageLimit / services.length) : 1;
                        
                        user.promotions.push({
                            category: category,
                            multiplier: multiplier,
                            createdAt: sub.purchasedAt || new Date(),
                            expiresAt: sub.expiresAt
                        });
                    }
                }
            }
            
            await user.save();
            migrated++;
        }
        
        res.status(200).json({
            success: true,
            message: `Successfully migrated promotions for ${migrated} users.`,
        });
        
    } catch (error) {
        next(error);
    }
};


export const activateUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { isActive: true },
            { new: true, select: 'name email isActive role isVerified' } // Select specific fields for response
        );

        if (!user) {
            res.status(404);
            throw new Error('User not found.');
        }

        res.status(200).json({
            success: true,
            message: `User ${user.name} has been activated.`,
            data: user,
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Deactivate a user's account (Admin)
 * @route   PUT /api/users/admin/deactivate/:userId
 * @access  Private/Admin
 */
export const deactivateUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { isActive: false },
            { new: true, select: 'name email isActive role isVerified' } // Select specific fields for response
        );

        if (!user) {
            res.status(404);
            throw new Error('User not found.');
        }

        res.status(200).json({
            success: true,
            message: `User ${user.name} has been deactivated.`,
            data: user,
        });

    } catch (error) {
        next(error);
    }
};

// controllers/UserController.js

// ... (Existing imports)

// ... (Existing controller functions like activateUser, deactivateUser)

/**
 * @desc    Update specific boolean flags for a user (Admin)
 * @route   PUT /api/users/admin/flags/:userId
 * @access  Private/Admin
 */
// controllers/userController.js (Add this function)
export const updateUserFlags = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        
        // ✅ FIX: Directly destructure the expected flags from req.body.
        // We assume req.body directly contains the flag properties 
        // if the RTK Query mutation sends them flat (body: flags).
        const { isBusinessUser, gstinConsentGiven, agreementSigned } = req.body;
        
        // Check if req.body is completely empty (no flags sent at all)
        if (Object.keys(req.body).length === 0) {
            res.status(400);
            // Changed error message for clarity if req.body is truly empty
            throw new Error('Request body cannot be empty. Please provide at least one flag for update.'); 
        }

        const updateFields = {};

        // 1. isBusinessUser
        if (isBusinessUser !== undefined) {
            updateFields.isBusinessUser = isBusinessUser;
        }

        // 2. gstinConsentGiven
        if (gstinConsentGiven !== undefined) {
            updateFields.gstinConsentGiven = gstinConsentGiven;
            // Set timestamp if consent is given (true)
            if (gstinConsentGiven === true) {
                updateFields.gstinConsentGivenAt = new Date();
            } else if (gstinConsentGiven === false) {
                 // Optionally clear timestamp if revoked
                updateFields.gstinConsentGivenAt = null; 
            }
        }

        // 3. agreementSigned
        if (agreementSigned !== undefined) {
            updateFields.agreementSigned = agreementSigned;
        }
        
        // Final check for empty update payload
        if (Object.keys(updateFields).length === 0) {
            res.status(400);
            throw new Error('No valid flags provided for update.');
        }

        // Find the user and apply only the specified updates
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { 
                new: true, 
                runValidators: true, 
                select: 'name email isBusinessUser gstinConsentGiven agreementSigned isActive isVerified role gstinConsentGivenAt' 
            }
        );

        if (!user) {
            res.status(404);
            throw new Error('User not found.');
        }

        res.status(200).json({
            success: true,
            message: `User ${user.name} flags updated successfully.`,
            data: user,
        });

    } catch (error) {
        // Send a more detailed server error for debugging
        if (error.message.includes('Flags data is missing')) {
             return res.status(400).json({ success: false, message: error.message });
        }
        // General error handling
        next(error); 
    }
};


// export const getVerificationCredits = async (req, res, next) => {
//   try {
//     const user = await User.findById(req.user.id).select("totalVerifications usedVerifications");

//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     const remaining = user.totalVerifications - user.usedVerifications;

//     res.status(200).json({
//       success: true,
//       total: user.totalVerifications,
//       used: user.usedVerifications,
//       remaining
//     });

//   } catch (error) {
//     next(error);
//   }
// };

export const getVerificationCredits = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      "totalVerifications usedVerifications activeSubscriptions"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 🟢 Credits
    const creditsTotal = user.totalVerifications || 0;
    const creditsUsed = user.usedVerifications || 0;
    const creditsRemaining = Math.max(0, creditsTotal - creditsUsed);

    // 🟢 Subscriptions
    const subscriptionUsed =
      user.activeSubscriptions?.reduce(
        (sum, s) => sum + (s.usageCount || 0),
        0
      ) || 0;

    const subscriptionRemaining =
      user.activeSubscriptions?.reduce(
        (sum, s) => sum + ((s.usageLimit - s.usageCount) || 0),
        0
      ) || 0;

    res.status(200).json({
      success: true,

      // ⭐ CREDITS
      total: creditsTotal,
      used: creditsUsed,
      remaining: creditsRemaining,

      // ⭐ SUBSCRIPTIONS
      subscriptionUsed,
      subscriptionRemaining,

      // ⭐ TOTAL USAGE = Credits + Subscription
      totalUsage: creditsUsed + subscriptionUsed
    });

  } catch (error) {
    next(error);
  }
};

export const addVerificationCredits = async (req, res, next) => {
  try {
    const { userId, credits } = req.body;

    if (!userId || !credits) {
      return res.status(400).json({ success: false, message: "userId and credits required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.totalVerifications += credits;
    await user.save();

    res.status(200).json({
      success: true,
      message: `${credits} verifications added`,
      data: {
        total: user.totalVerifications,
        used: user.usedVerifications,
        remaining: user.totalVerifications - user.usedVerifications,
      }
    });

  } catch (error) {
    next(error);
  }
};
export const migrateVerificationCredits = async (req, res, next) => {
  try {
    const users = await User.find({});

    let updated = 0;

    for (const user of users) {

      // Agar field missing hai to initialize karo
      if (user.totalVerifications === undefined) {
        user.totalVerifications = 100; // ⭐ apni marzi ka default do
        updated++;
      }

      if (user.usedVerifications === undefined) {
        user.usedVerifications = 0;
        updated++;
      }

      await user.save();
    }

    res.status(200).json({
      success: true,
      message: `Migration complete. Updated ${updated} users.`,
    });

  } catch (error) {
    next(error);
  }
};
export const updateVerificationCredits = async (req, res, next) => {
  try {
    const { userId, credits } = req.body;

    if (!userId || credits === undefined) {
      return res.status(400).json({
        success: false,
        message: "userId and credits are required"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // credits positive -> add
    // credits negative -> subtract
    let newTotal = user.totalVerifications + credits;

    if (newTotal < 0) {
      return res.status(400).json({
        success: false,
        message: "Credits cannot go negative"
      });
    }

    user.totalVerifications = newTotal;
    await user.save();

    res.status(200).json({
      success: true,
      message: credits >= 0 
        ? `${credits} credits added` 
        : `${Math.abs(credits)} credits removed`,
      data: {
        total: user.totalVerifications,
        used: user.usedVerifications,
        remaining: user.totalVerifications - user.usedVerifications,
      }
    });

  } catch (error) {
    next(error);
  }
};
