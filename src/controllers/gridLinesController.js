// // src/controllers/kycController.js
// import { fetchPanFatherName } from '../services/gridLinesService.js';

// // @desc    Verify user's PAN and fetch father's name
// // @route   POST /api/kyc/verify-pan
// // @access  Private
// export const verifyPan = async (req, res, next) => {
//   try {
//     const { panNumber } = req.body;

//     // TODO: PAYMENT FLOW INTEGRATION
//     // Before calling the expensive API, check if the user has enough credits or an active subscription.
//     // 1. Get the user from `req.user` (attached by the `protect` middleware).
//     // 2. Check a `credits` or `subscriptionStatus` field on the user model.
//     // 3. If they don't have credits, return a 402 Payment Required status.
//     // Example:
//     // if (req.user.credits < 1) {
//     //   return res.status(402).json({ success: false, message: 'Insufficient credits. Please top up.' });
//     // }

//     // Call the service to interact with the Gridlines API
//     const verificationData = await fetchPanFatherName(panNumber);

//     // TODO: PAYMENT FLOW - DEDUCT CREDIT
//     // If the API call was successful, deduct a credit from the user's account.
//     // req.user.credits -= 1;
//     // await req.user.save();
    
//     res.status(200).json({
//       success: true,
//       data: verificationData,
//     });
//   } catch (error) {
//     // Errors from the service layer will be caught here
//     next(error);
//   }
// };