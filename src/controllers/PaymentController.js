// Payment controller handling Razorpay integration, subscriptions and transactions
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Transaction from '../models/TransactionModel.js';
import Coupon from '../models/CouponModel.js';
import User from '../models/UserModel.js';
import PricingPlan from '../models/PricingModel.js'; 
import Service from '../models/Service.js';

// Initialize Razorpay with API credentials
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


export const createSubscriptionOrder = async (req, res, next) => {
    try {
        const { planName, planType, couponCode } = req.body;
        const user = await User.findById(req.user.id);

        if (!planName || !planType) {
            res.status(400);
            throw new Error('Plan name and plan type (monthly/yearly) are required.');
        }

        // The renewal logic is handled after payment verification or in the free plan section.

        //  Get plan pricing and limits from the database 
        const pricingPlan = await PricingPlan.findOne({ name: planName });
        if (!pricingPlan) {
            res.status(404);
            throw new Error(`Pricing for plan '${planName}' not found.`);
        }

        const planDetails = pricingPlan[planType];
        if (!planDetails || typeof planDetails.price === 'undefined' || typeof planDetails.limitPerMonth === 'undefined') {
            res.status(404);
            throw new Error(`Pricing details for plan '${planName} - ${planType}' are incomplete.`);
        }

        const originalAmountInRupees = planDetails.price;
        const usageLimit = planDetails.limitPerMonth;

        let finalAmountInRupees = originalAmountInRupees;
        let discountValue = 0;
        let appliedCoupon = null;

        // Coupon logic
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
            if (coupon) {
                const isExpired = coupon.expiryDate && coupon.expiryDate < new Date();
                const isUsedUp = coupon.maxUses && coupon.timesUsed >= coupon.maxUses;
                const meetsMinAmount = originalAmountInRupees >= coupon.minAmount;
                //  Applicable categories map to plan names
                const isApplicable = coupon.applicableCategories.length === 0 || coupon.applicableCategories.includes(planName);

                if (!isExpired && !isUsedUp && meetsMinAmount && isApplicable) {
                    appliedCoupon = coupon;
                    discountValue = (coupon.discount.type === 'fixed')
                        ? coupon.discount.value
                        : (originalAmountInRupees * coupon.discount.value) / 100;
                    finalAmountInRupees = Math.max(0, originalAmountInRupees - discountValue);
                }
            }
        }

        // Handle cases where the final amount is zero (100% discount)
        if (finalAmountInRupees <= 0) {
            const now = new Date();
            // Handle renewal for free plans
            const existingSubIndex = user.activeSubscriptions.findIndex(sub =>
                sub.category === planName && sub.expiresAt > now
            );

            if (existingSubIndex > -1) {
                // RENEW an existing subscription
                const existingSub = user.activeSubscriptions[existingSubIndex];
                const currentExpiresAt = new Date(existingSub.expiresAt);
                const newExpiresAt = planType === 'monthly'
                    ? new Date(currentExpiresAt.setMonth(currentExpiresAt.getMonth() + 1))
                    : new Date(currentExpiresAt.setFullYear(currentExpiresAt.getFullYear() + 1));

                user.activeSubscriptions[existingSubIndex].expiresAt = newExpiresAt;
                user.activeSubscriptions[existingSubIndex].usageLimit += usageLimit; // Add to existing limit
                user.activeSubscriptions[existingSubIndex].planType = planType;
            } else {
                // CREATE a new subscription
                const expiresAt = planType === 'monthly'
                    ? new Date(new Date().setMonth(now.getMonth() + 1))
                    : new Date(new Date().setFullYear(now.getFullYear() + 1));

                const newSubscription = {
                    category: planName,
                    planType: planType,
                    usageLimit: usageLimit,
                    expiresAt: expiresAt,
                    purchasedAt: now,
                };
                user.activeSubscriptions.push(newSubscription);
            }

            await user.save();

            // create a transaction record for this free activation
            await Transaction.create({
                user: user._id,
                category: planName,
                plan: planType,
                status: 'completed',
                amount: 0,
                originalAmount: originalAmountInRupees,
                discountApplied: originalAmountInRupees,
                couponCode: appliedCoupon ? appliedCoupon.code : 'PROMOTIONAL_FREE',
            });

            if (appliedCoupon) {
                appliedCoupon.timesUsed += 1;
                await appliedCoupon.save();
            }

            return res.status(200).json({
                success: true,
                paymentSkipped: true,
                message: 'Subscription activated or renewed successfully with a full discount.',
            });
        }

        const options = {
            amount: Math.round(finalAmountInRupees * 100), // Amount in paise for Razorpay
            currency: "INR",
            receipt: `receipt_order_${new Date().getTime()}`,
        };

        const order = await razorpay.orders.create(options);

        // Create a pending transaction
        const transaction = await Transaction.create({
            user: user.id,
            category: planName,
            plan: planType,
            status: 'pending',
            amount: finalAmountInRupees,
            originalAmount: originalAmountInRupees,
            discountApplied: discountValue,
            couponCode: appliedCoupon ? appliedCoupon.code : undefined,
            razorpay_order_id: order.id,
        });

        res.status(201).json({
            success: true,
            paymentSkipped: false,
            order,
            key_id: process.env.RAZORPAY_KEY_ID,
            transactionId: transaction._id,
        });

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Creates a new subscription order for a DYNAMIC subcategory-based plan.
 * @route   POST /api/payment/dynamic-order
 * @access  Private
 */
export const createDynamicSubscriptionOrder = async (req, res, next) => {
    try {
        const { subcategory, billingCycle = 'monthly', quantity = 100, duration, unitPrice, totalAmount, currency = 'INR', couponCode } = req.body;
        // Coerce numeric inputs defensively (frontend may send strings)
        const qty = Number(quantity);
        const unit = Number(unitPrice);
        const clientTotal = Number(totalAmount);
        const user = await User.findById(req.user.id);

        if (!subcategory) {
            res.status(400);
            throw new Error('Subcategory is required for a dynamic plan purchase.');
        }

        //  Find all services belonging to this subcategory
        const servicesInSubcategory = await Service.find({ subcategory: subcategory });

        if (servicesInSubcategory.length === 0) {
            res.status(404);
            throw new Error(`No services found for the subcategory: '${subcategory}'`);
        }

        // Validate billingCycle
        const allowedCycles = ['monthly', 'quarterly', 'yearly'];
        if (!allowedCycles.includes(billingCycle)) {
            res.status(400);
            throw new Error('Invalid billingCycle. Allowed: monthly, quarterly, yearly');
        }

        // Enforce minimum quantities per cycle
        const mins = { monthly: 150, quarterly: 500, yearly: 1000 };
        if (!Number.isFinite(qty) || qty < mins[billingCycle]) {
            res.status(400);
            throw new Error(`Minimum quantity for ${billingCycle} is ${mins[billingCycle]}.`);
        }

        // Validate pricing inputs (prices are provided in rupees)
        if (!Number.isFinite(unit) || !Number.isFinite(clientTotal)) {
            res.status(400);
            throw new Error('unitPrice and totalAmount are required and must be numbers (in rupees).');
        }
        const originalTotal = unit * qty;

        // Optional coupon processing (server-side validation)
        let discountValue = 0;
        let appliedCoupon = null;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase(), isActive: true });
            if (!coupon) {
                res.status(400);
                throw new Error('Invalid or inactive coupon code.');
            }
            // Validate expiry
            if (coupon.expiryDate && coupon.expiryDate < new Date()) {
                res.status(400);
                throw new Error('This coupon has expired.');
            }
            // Validate min amount
            if (originalTotal < (coupon.minAmount || 0)) {
                res.status(400);
                throw new Error(`Coupon requires a minimum order of ₹${coupon.minAmount}.`);
            }
            // Validate applicability to subcategory when restricted
            if (Array.isArray(coupon.applicableCategories) && coupon.applicableCategories.length > 0) {
                const allowed = coupon.applicableCategories.includes(subcategory);
                if (!allowed) {
                    res.status(400);
                    throw new Error('Coupon is not applicable to this subcategory.');
                }
            }
            // Calculate discount
            if (coupon.discount.type === 'percentage') {
                discountValue = Math.round((originalTotal * coupon.discount.value) / 100);
            } else {
                discountValue = Math.round(coupon.discount.value);
            }
            // Do not exceed subtotal
            if (discountValue > originalTotal) {
                discountValue = originalTotal;
            }
            appliedCoupon = coupon;
        }

        const computedTotal = Math.max(0, originalTotal - discountValue);

        // Final amount must match frontend provided totalAmount (both in rupees)
        // Allow a tolerance of ±1 rupee to avoid rounding mismatches between FE/BE
        if (Math.abs(Math.round(computedTotal) - Math.round(clientTotal)) > 1) {
            res.status(400);
            throw new Error('Total amount mismatch. Please refresh and try again.');
        }

// Prevent re-purchase only if subscription is *truly active* 
// i.e., has time left AND usageLimit remaining.
const hasActiveSub = user.activeSubscriptions.some(sub =>
    sub.subcategory === subcategory &&
    new Date(sub.expiresAt) > new Date() &&
    sub.usageLimit > 0
);


if (hasActiveSub) {
    res.status(400);
    throw new Error(`You already have an active subscription for '${subcategory}'.`);
}


        // Create Razorpay order strictly from unit price and quantity (rupees → paise)
        const amountPaise = Math.round(computedTotal * 100);
        const options = {
            amount: amountPaise,
            currency: 'INR',
            receipt: `receipt_dynamic_${new Date().getTime()}`,
            notes: { subcategory, billingCycle, quantity, unitPrice, totalAmount, couponCode: couponCode || null, discountValue }
        };

        const order = await razorpay.orders.create(options);

        // Map billingCycle to legacy plan enum for storage
        const planType = billingCycle === 'monthly' ? 'monthly' : 'yearly';

        // Create a pending transaction for this dynamic order
        const transaction = await Transaction.create({
            user: user.id,
            category: subcategory,
            plan: planType,
            status: 'pending',
            amount: Math.round(computedTotal),
            originalAmount: Math.round(originalTotal),
            discountApplied: discountValue,
            couponCode: appliedCoupon ? appliedCoupon.code : undefined,
            razorpay_order_id: order.id,
            quantity: qty,
            billingCycle: billingCycle,
            duration: duration,
            metadata: { unitPrice, totalAmount }
        });

        res.status(201).json({
            success: true,
            paymentSkipped: false,
            order: { id: order.id, amount: order.amount, currency: order.currency },
            key_id: process.env.RAZORPAY_KEY_ID,
            transactionId: transaction._id,
        });

    } catch (error) {
        next(error);
    }
};


// Verifies Razorpay payment and activates user subscription
// Endpoint: POST /api/payment/verify
// Requires authentication
// Handles signature verification, subscription activation, and coupon processing
export const verifySubscriptionPayment = async (req, res, next) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        transactionId,
    } = req.body;

    let transaction;
    try {
        transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            res.status(404);
            throw new Error('Transaction not found.');
        }

        if (transaction.status !== 'pending') {
            res.status(400);
            throw new Error(`This transaction has already been processed with status: ${transaction.status}.`);
        }

        // Verify the payment signature
        const hmac_body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(hmac_body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            transaction.status = 'failed';
            transaction.metadata = { reason: 'Payment verification failed: Signature mismatch.' };
            await transaction.save();
            res.status(400);
            throw new Error('Payment verification failed. Invalid signature.');
        }

        // Payment signature verified successfully
        transaction.status = 'completed';
        transaction.razorpay_payment_id = razorpay_payment_id;
        transaction.razorpay_signature = razorpay_signature;
        await transaction.save();

        // Load user
        const user = await User.findById(transaction.user);
        const now = new Date();

        //  Check for an existing active subscription to update it (renewal)
        const existingSubIndex = user.activeSubscriptions.findIndex(sub =>
            sub.category === transaction.category && sub.expiresAt > now
        );

        if (existingSubIndex > -1) {
            // RENEWAL: Update the existing subscription
            const existingSub = user.activeSubscriptions[existingSubIndex];
            const currentExpiresAt = new Date(existingSub.expiresAt);

            // Calculate new expiration based on billingCycle
            let monthsToAdd = 1;
            if (transaction.billingCycle === 'quarterly') monthsToAdd = 3;
            else if (transaction.billingCycle === 'yearly') monthsToAdd = 12;
            
            const newExpiresAt = new Date(currentExpiresAt.setMonth(currentExpiresAt.getMonth() + monthsToAdd));

            user.activeSubscriptions[existingSubIndex].expiresAt = newExpiresAt;
            // Add newly purchased quantity to existing usageLimit
            user.activeSubscriptions[existingSubIndex].usageLimit += transaction.quantity;
            user.activeSubscriptions[existingSubIndex].planType = transaction.plan;
            if (transaction.category) {
                user.activeSubscriptions[existingSubIndex].subcategory = transaction.category;
            }
            // Persist latest billingCycle/quantity metadata if present
            if (transaction.billingCycle) {
                user.activeSubscriptions[existingSubIndex].billingCycle = transaction.billingCycle;
            }
            if (typeof transaction.quantity === 'number') {
                user.activeSubscriptions[existingSubIndex].quantity = (user.activeSubscriptions[existingSubIndex].quantity || 0) + transaction.quantity;
            }
            user.activeSubscriptions[existingSubIndex].purchasedAt = now;

        } else {
            // NEW SUBSCRIPTION: Add a new subscription object to the array
            // Calculate expiration based on billingCycle
            let monthsToAdd = 1;
            if (transaction.billingCycle === 'quarterly') monthsToAdd = 3;
            else if (transaction.billingCycle === 'yearly') monthsToAdd = 12;
            
            const expiresAt = new Date(now.setMonth(now.getMonth() + monthsToAdd));

      // Find exact service to resolve correct category & service_key
const anyService = await Service.findOne({ subcategory: transaction.category });

const newSubscription = {
    category: anyService?.category || transaction.category,
    subcategory: transaction.category,
    serviceKey: anyService?.service_key,
    planType: transaction.plan,
    billingCycle: transaction.billingCycle,
    quantity: transaction.quantity,
    usageLimit: transaction.quantity,
    purchasedAt: now,
    expiresAt: expiresAt,
};

            user.activeSubscriptions.push(newSubscription);
        }

        await user.save(); // Save the updated user document

        // Update coupon usage count if discount was applied
        if (transaction.couponCode) {
            await Coupon.updateOne(
                { code: transaction.couponCode },
                { $inc: { timesUsed: 1 } }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Subscription activated or renewed successfully!',
        });

    } catch (error) {
        // If an error occurs after payment, mark the transaction as failed for manual review
        if (transaction && transaction.status === 'pending') {
            transaction.status = 'failed';
            transaction.metadata = { reason: 'Subscription activation failed after payment.', error: error.message };
            await transaction.save();
        }
        next(error);
    }
};