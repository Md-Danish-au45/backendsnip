import Service from '../models/Service.js';
import PricingPlan from '../models/PricingModel.js';
import asyncHandler from 'express-async-handler';

/**
 * @desc Middleware to remove redundant subcategory subscriptions covered by main plans
 * This function checks if user has purchased a main plan (Personal, Professional, Enterprise)
 * that already covers subcategories they bought separately, and removes those redundant subscriptions
 * @access Private  
 */
export const cleanupRedundantSubscriptions = asyncHandler(async (req, res, next) => {
    const user = req.user;
    
    if (!user.activeSubscriptions || user.activeSubscriptions.length === 0) {
        return next();
    }

    // Get all pricing plans that have included services
    const pricingPlans = await PricingPlan.find({}).populate('includedServices');
    
    // Track which subscriptions should be removed
    const subscriptionsToRemove = [];
    
    // Check each user subscription against pricing plans
    for (let i = 0; i < user.activeSubscriptions.length; i++) {
        const subscription = user.activeSubscriptions[i];
        
        // Check if this subscription is covered by any pricing plan the user has
        for (const plan of pricingPlans) {
            // Check if user has this pricing plan active
            const hasMainPlan = user.activeSubscriptions.some(sub => 
                sub.category === plan.name && 
                sub.expiresAt > new Date()
            );
            
            if (hasMainPlan) {
                // Check if current subscription's category/subcategory is covered by this plan
                const isCoveredByPlan = plan.includedServices.some(service => 
                    service.category === subscription.category || 
                    service.subcategory === subscription.category
                );
                
                if (isCoveredByPlan && subscription.category !== plan.name) {
                    // This subscription is redundant - mark for removal
                    subscriptionsToRemove.push(i);
                    break;
                }
            }
        }
    }
    
    // Remove redundant subscriptions if any found
    if (subscriptionsToRemove.length > 0) {
        user.activeSubscriptions = user.activeSubscriptions.filter(
            (_, index) => !subscriptionsToRemove.includes(index)
        );
        await user.save();
    }
    
    next();
});

/**
 * @desc Middleware to check if a user has a valid and active subscription for a specific service.
 * It verifies:
 * 1. The subscription is not expired.
 * 2. The usage limit for the plan has not been reached.
 * 3. The requested service is included in the user's subscription plan.
 * If a subscription for the service is found to be invalid (expired or usage limit reached), it is removed.
 * @access Private
 */
export const checkSubscription = asyncHandler(async (req, res, next) => {
    // console.log(req.body)
    const { serviceKey } = req.body;
    const user = req.user;

    if (!serviceKey) {
        res.status(400);
        throw new Error('A serviceKey must be provided in the request body.');
    }

    // First, clean up any redundant subscriptions
    await cleanupRedundantSubscriptions(req, res, () => {});

    // Find the service to get its ID, category, and subcategory
    const service = await Service.findOne({ service_key: serviceKey, is_active: true });
    if (!service) {
        res.status(404);
        throw new Error(`Service with key '${serviceKey}' not found or is inactive.`);
    }

    //  Find all explicit pricing plans that include this service (e.g., "Personal", "Enterprise")

    const explicitPlans = await PricingPlan.find({ includedServices: service._id }).select('name');
    const explicitPlanNames = new Set(explicitPlans.map(p => p.name));

    // console.log(explicitPlans);
   
    
    //  Find a valid, active subscription that covers this service and clean up invalid ones.
    let validSubscription = null;
    let subscriptionIndex = -1;
    const invalidSubsIndices = [];

    // console.log(user)
    for (let i = 0; i < user.activeSubscriptions.length; i++) {
        const sub = user.activeSubscriptions[i];
        let isPlanCovered = false;
        // console.log(sub)
        // console.log("service.category",service.category);
        // console.log("sub.category",sub.category);
        //   console.log("service.sub",service.subcategory);
        // // console.log("sub.category",sub.category);
        // console.log( explicitPlanNames);

        //  Determine if the subscription covers the service 
        // A plan is covered if:
        // a) The plan name directly matches the service's category or subcategory.
        // b) The service is explicitly listed in a bundled plan (like "Personal").
let serviceCat = (service.category || "").trim().toLowerCase();
let serviceSub = (service.subcategory || "").trim().toLowerCase();
let subCat = (sub.category || "").trim().toLowerCase();

if (subCat === serviceCat) isPlanCovered = true;
else if (subCat === serviceSub) isPlanCovered = true;
else if (explicitPlanNames.has(sub.category)) isPlanCovered = true;
else isPlanCovered = false;

        
        // Only evaluate subscriptions that are meant for this service.
        if (isPlanCovered) {
            const isNotExpired = sub.expiresAt > new Date();
            const hasUsageLeft = sub.usageCount < sub.usageLimit;

            if (isNotExpired && hasUsageLeft && !validSubscription) {
                // This is a valid subscription. Store it and its index.
                validSubscription = sub;
                subscriptionIndex = i;
            } else if (!isNotExpired || !hasUsageLeft) {
                // This subscription is for the correct service but is invalid. Flag it for removal.
                invalidSubsIndices.push(i);
            }
        }
        
    }

    //  Handle the outcome of the subscription check
    if (validSubscription) {
        // A valid subscription was found. Attach it to the request and proceed.
        req.subscription = validSubscription;
        req.subscriptionIndex = subscriptionIndex;
        return next();
    }

    //  If no valid subscription was found, clean up any invalid ones and throw an error.
    if (invalidSubsIndices.length > 0) {
        // Filter out subscriptions using their indices. This is safe as we are creating a new array.
        user.activeSubscriptions = user.activeSubscriptions.filter(
            (_, index) => !invalidSubsIndices.includes(index)
        );
        await user.save(); // Persist the changes to the user document.
    }

   // ⭐ If user has verification credits → allow without subscription
if (user.totalVerifications > user.usedVerifications) {
    req.subscription = null;     // No subscription used
    req.subscriptionIndex = -1;  // No subscription index
    return next();               // ALLOW verification
}

// Otherwise block user
res.status(403);
throw new Error('You do not have a valid subscription to use this service, or you have reached your usage limit for the month.');

});