import Service from '../models/Service.js';
import * as gridlines from '../services/gridLinesService.js';
import VerificationResult from '../models/VerificationResultModel.js';
import FormData from 'form-data';

/**
 * @desc    Execute a service for a user with a VALID subscription
 * @route   POST /api/verification/verify
 * @access  Private (Protected by 'protect' and 'checkSubscription' middleware)
 */
// export const executeSubscribedService = async (req, res, next) => {
//   // The 'checkSubscription' middleware has already validated the user and their subscription.
//   // It attaches the subscription to req.subscription and its index to req.subscriptionIndex.
//   const { serviceKey, ...otherData } = req.body;
  
//   const user = req.user;
//   const uploadedFiles = req.files || {};

//   const service = await Service.findOne({ service_key: serviceKey });
  
//   // Combine uploaded files with other form data
//   const payload = { ...otherData };
  
//   // Add files to payload - handle both single files and file arrays
//   Object.keys(uploadedFiles).forEach(fieldName => {
//     const files = uploadedFiles[fieldName];
//     if (Array.isArray(files) && files.length > 0) {
//       payload[fieldName] = files[0]; // Take first file if array
//     } else if (files) {
//       payload[fieldName] = files;
//     }
//   });
  
//   let actualPayload = payload; // Declare outside try block so it's accessible in catch
  
//   try {
//     if (!service) {
//       res.status(404);
//       return next(new Error(`Service with key '${serviceKey}' not found.`));
//     }

//     let result;
//     // actualPayload is already initialized above
    
//     // ⭐ DEDUCT 1 CREDIT FOR EVERY VERIFICATION
// if (user.totalVerifications > user.usedVerifications) {
//   user.usedVerifications += 1;
// } else {
//   return res.status(403).json({
//     success: false,
//     message: "No verification credits left. Please purchase more."
//   });
// }

//     if (service.apiType === 'form') {
//       // Create FormData using the form-data library for Node.js
//       const formData = new FormData();
      
//       // Add regular form fields and files
//       Object.keys(payload).forEach(key => {
//         const value = payload[key];
//         if (value !== null && value !== undefined) {
//           // Check if it's a file (has buffer property from multer)
//           if (value && value.buffer) {
//             // This is a file from multer - append buffer with proper options
//             formData.append(key, value.buffer, {
//               filename: value.originalname,
//               contentType: value.mimetype
//             });
//           } else {
//             // Regular form field
//             formData.append(key, String(value));
//           }
//         }
//       });
      
//       // Prepare actualPayload for storage (convert files to metadata)
//       actualPayload = {};
//       Object.keys(payload).forEach(key => {
//         const value = payload[key];
//         if (value && value.buffer) {
//           actualPayload[key] = {
//             filename: value.originalname,
//             mimetype: value.mimetype,
//             size: value.size
//           };
//         } else {
//           actualPayload[key] = value;
//         }
//       });

//       Object.keys(payload).forEach(key => {
//         console.log(`- ${key}: ${payload[key] && payload[key].buffer ? 'FILE' : payload[key]}`);
//       });
      
//       result = await gridlines.callFormApi(service.endpoint, formData);
//     } else {
//       if (!payload) throw new Error('A payload object is required for JSON APIs.');
//       result = await gridlines.callJsonApi(service.endpoint, payload);
//       actualPayload = payload;
//     }



//     await VerificationResult.create({
//       verificationId: `VRF-${Date.now()}`,
//       user: user._id,
//       service: service._id,
//       status: 'success',
//       inputPayload: actualPayload || {}, // Use actualPayload and provide fallback
//       resultData: result,
//     });
//     //  Increment the usage count on the specific subscription that was used
//     // user.activeSubscriptions[req.subscriptionIndex].usageCount += 1;

//     //  Increment the global usage count for the service (for general analytics)
//     // service.globalUsageCount += 1;

//     // Increment the user's historical usage log (for their personal history)
//     const serviceData = {
//       service: service._id,
//       serviceName: service.name,
//       subcategory: service.subcategory
//     };
//     user.activeSubscriptions[req.subscriptionIndex].usageCount += 1;

//     // Check if usage limit is reached and remove subscription if needed
//     const currentSubscription = user.activeSubscriptions[req.subscriptionIndex];
//     if (currentSubscription.usageCount >= currentSubscription.usageLimit) {
//       // Remove this subscription as it has reached its limit
//       user.activeSubscriptions = user.activeSubscriptions.filter(
//         (_, index) => index !== req.subscriptionIndex
//       );
//     }

//     // Increment the global usage count for the service
//     service.globalUsageCount += 1;

//     //  Find the user's historical usage record for this service
//     const serviceUsageIndex = user.usedServices.findIndex(
//       s => s.service.toString() === service._id.toString()
//     );

//     if (serviceUsageIndex > -1) {
//       // If the service has been used before, update the existing record.
//       const usedService = user.usedServices[serviceUsageIndex];

//       // Add the new timestamp to the history array.
//       usedService.usageTimestamps.push(new Date());

//       // Ensure the usageCount reflects the total number of timestamps.
//       usedService.usageCount = usedService.usageTimestamps.length;

//       // Keep other details like name and subcategory updated.
//       usedService.serviceName = service.name;
//       usedService.subcategory = service.subcategory;

//     } else {
//       // If this is the first time, create a new record.
//       user.usedServices.push({
//         service: service._id,
//         serviceName: service.name,
//         subcategory: service.subcategory,
//         // Initialize the history with the very first timestamp.
//         usageTimestamps: [new Date()],
//         // The count is now 1.
//         usageCount: 1,
//       });
//     }
//     // Deduct 1 verification credit
// if (user.totalVerifications > user.usedVerifications) {
//   user.usedVerifications += 1;
// } else {
//   return res.status(403).json({
//     success: false,
//     message: "No verification credits left. Please purchase more."
//   });
// }

//     // Concurrently save the updated service and user documents
//     await Promise.all([service.save(), user.save({ validateModifiedOnly: true })]);

//     res.status(200).json({
//       success: true,
//       data: result,
//       outputFields: service.outputFields,
//     });

//   } catch (error) {
//     if (user && service) {
//       await VerificationResult.create({
//         verificationId: `VRF-${Date.now()}`,
//         user: user._id,
//         service: service._id,
//         status: 'failed',
//         inputPayload: actualPayload || payload || {}, // Use actualPayload with fallbacks
//         resultData: error.response?.data, 
//         errorMessage: error.message,
//       });
//     }

//     // ⭐ Deduct exactly 1 credit ONLY ONCE ⭐
// if (user.totalVerifications > user.usedVerifications) {
//   user.usedVerifications += 1;
// } else {
//   return res.status(403).json({
//     success: false,
//     message: "No verification credits left. Please purchase more."
//   });
// }

//     next(error);
//   }
// };

const EPFO_LIMITED_SERVICES = [
  "epfo-api/employment-history/fetch-by-uan",
  "epfo-api/employment-history/fetch-latest"
];


export const executeSubscribedService = async (req, res, next) => {
  const { serviceKey, ...otherData } = req.body;

  const user = req.user;
  const uploadedFiles = req.files || {};

  const service = await Service.findOne({ service_key: serviceKey });

  const payload = { ...otherData };

  // Merge files into payload
  Object.keys(uploadedFiles).forEach((fieldName) => {
    const files = uploadedFiles[fieldName];
    if (Array.isArray(files) && files.length > 0) {
      payload[fieldName] = files[0];
    } else if (files) {
      payload[fieldName] = files;
    }
  });

  let actualPayload = payload;

  try {
    if (!service) {
      res.status(404);
      return next(new Error(`Service with key '${serviceKey}' not found.`));
    }

    // 🔍 Check if this service is EPFO-limited (by endpoint OR service_key)
const isLimitedEpfoService =
  EPFO_LIMITED_SERVICES.some(key => service.endpoint.includes(key));


    let result;

    // --------------------------
    // 📌 JSON vs FORM API Handle
    // --------------------------
    if (service.apiType === "form") {
      const formData = new FormData();

      Object.keys(payload).forEach((key) => {
        const value = payload[key];
        if (value !== null && value !== undefined) {
          if (value && value.buffer) {
            formData.append(key, value.buffer, {
              filename: value.originalname,
              contentType: value.mimetype,
            });
          } else {
            formData.append(key, String(value));
          }
        }
      });

      actualPayload = {};
      Object.keys(payload).forEach((key) => {
        const value = payload[key];
        if (value && value.buffer) {
          actualPayload[key] = {
            filename: value.originalname,
            mimetype: value.mimetype,
            size: value.size,
          };
        } else {
          actualPayload[key] = value;
        }
      });

      result = await gridlines.callFormApi(service.endpoint, formData);
    } else {
      result = await gridlines.callJsonApi(service.endpoint, payload);
      actualPayload = payload;
    }

    // --------------------------------------------------------------
    // ⭐ correct logic — subscription FIRST, then credits
    // --------------------------------------------------------------
    let usedSubscription = false;
    const subIndex = req.subscriptionIndex;
    const subscription =
      user.activeSubscriptions && user.activeSubscriptions[subIndex];

    // 1️⃣ Try to use subscription first
    if (subscription) {
      const remaining = subscription.usageLimit - subscription.usageCount;

      if (remaining > 0) {
        subscription.usageCount += 1;
        usedSubscription = true;
      }
    }

    // 2️⃣ If subscription NOT used → use credits, with EPFO limit
    if (!usedSubscription) {
      // 🔐 First check credits available
      if (user.totalVerifications <= user.usedVerifications) {
        return res.status(403).json({
          success: false,
          message: "No verification credits left. Please purchase more.",
        });
      }

      // 🔸 EPFO LIMIT ONLY FOR CREDIT USERS
      if (isLimitedEpfoService) {
        if (!Array.isArray(user.limitedServiceUsage)) {
          user.limitedServiceUsage = [];
        }

        const now = new Date();
        const monthKey = now.getFullYear() * 100 + (now.getMonth() + 1); // e.g. 202511

        // Find or create usage entry for this EPFO service
        let usageEntry = user.limitedServiceUsage.find(
          (entry) => entry.serviceKey === service.service_key
        );

        if (!usageEntry) {
          usageEntry = {
            serviceKey: service.service_key,
            month: monthKey,
            count: 0,
          };
          user.limitedServiceUsage.push(usageEntry);
        } else if (usageEntry.month !== monthKey) {
          // New month → reset counter
          usageEntry.month = monthKey;
          usageEntry.count = 0;
        }

        // Enforce 15/month limit for credit usage
        if (usageEntry.count >= 15) {
          return res.status(403).json({
            success: false,
            message:
              "You have reached this month's limit (15) for this EPFO verification when using credits. Please try again next month or purchase a subscription for this service.",
          });
        }

        // Count this usage
        usageEntry.count += 1;
      }

      // 🔢 Finally deduct 1 credit
      user.usedVerifications += 1;
    }

    // -------------------------------------
    // Save SUCCESS result
    // -------------------------------------
    await VerificationResult.create({
      verificationId: `VRF-${Date.now()}`,
      user: user._id,
      service: service._id,
      status: "success",
      inputPayload: actualPayload || {},
      resultData: result,
    });

    // ------------------------------------------------------------
    // Remove subscription only if subscription was used and LIMIT reached
    // ------------------------------------------------------------
    if (usedSubscription && subIndex >= 0) {
      const currentSubscription = user.activeSubscriptions[subIndex];
      if (
        currentSubscription &&
        currentSubscription.usageCount >= currentSubscription.usageLimit
      ) {
        user.activeSubscriptions = user.activeSubscriptions.filter(
          (_, index) => index !== subIndex
        );
      }
    }

    // -------------------------------------
    // Service global usage
    // -------------------------------------
    service.globalUsageCount += 1;

    // -------------------------------------
    // User usage history
    // -------------------------------------
    const serviceUsageIndex = user.usedServices.findIndex(
      (s) => s.service.toString() === service._id.toString()
    );

    if (serviceUsageIndex > -1) {
      const usedService = user.usedServices[serviceUsageIndex];
      usedService.usageTimestamps.push(new Date());
      usedService.usageCount = usedService.usageTimestamps.length;
    } else {
      user.usedServices.push({
        service: service._id,
        serviceName: service.name,
        subcategory: service.subcategory,
        usageTimestamps: [new Date()],
        usageCount: 1,
      });
    }

    await Promise.all([
      service.save(),
      user.save({ validateModifiedOnly: true }),
    ]);

    res.status(200).json({
      success: true,
      data: result,
      outputFields: service.outputFields,
    });
  } catch (error) {
    if (user && service) {
      await VerificationResult.create({
        verificationId: `VRF-${Date.now()}`,
        user: user._id,
        service: service._id,
        status: "failed",
        inputPayload: actualPayload || payload || {},
        resultData: error.response?.data,
        errorMessage: error.message,
      });
    }

    next(error);
  }
};


export const getUserVerificationHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await VerificationResult.countDocuments({ user: req.user.id });

    const results = await VerificationResult.find({ user: req.user.id })
      .populate('service', 'name service_key imageUrl category') // Populate service details
      .sort({ createdAt: -1 }) // Show most recent first
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: results.length,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      data: results,
    });
  } catch (error) {
    next(error);
  }
};