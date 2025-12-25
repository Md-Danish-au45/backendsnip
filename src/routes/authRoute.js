
// 2. BACKEND: Updated routes (authRoutes.js)
import express from 'express';
import { check,body } from 'express-validator';
import { 
    register, 
    login, 
    registerWithMobile,
    loginWithMobile,
    verifyOtp,
    googleSignIn,
    verifyEmailOtp,
    forgotPassword,
    resetPassword,
    simpleRegister,
    verifyEmailWithToken,
    signAgreement,
    confirmGSTINConsent,
    verifyGSTINOnly,
    verifyAgreementOtp,
    sendAgreementOtp,
    resendMobileOtp,
    verifyMobileOtp
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Email verification route - MUST be a GET route
router.get('/verify-email/:token', verifyEmailWithToken);

// Other routes...
router.post('/verify-email-otp', [
    check('email', 'Please include a valid email').isEmail(),
    check('otp', 'OTP must be a 6-digit number').isLength({ min: 6, max: 6 }).isNumeric(),
], verifyEmailOtp);

router.post('/forgot-password', [
    check('email', 'Please include a valid email').isEmail(),
], forgotPassword);

router.put('/reset-password', [
    check('token', 'Reset token is required').not().isEmpty(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
], resetPassword);

router.post('/google-signin', [
    check('token', 'Google auth token is required').not().isEmpty(),
], googleSignIn);

router.post('/register', [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
], register);

// router.post('/simple-register', [
//     check('name', 'Name is required').not().isEmpty(),
//     check('email', 'Please include a valid email').isEmail(),
//     check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
// ], simpleRegister);
// Existing route ko modify karein
router.post('/simple-register', [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').optional().isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('mobile', 'Please include a valid mobile').optional().isMobilePhone(),
    // ✅ GSTIN optional field add karein
    check('gstin', 'Invalid GSTIN format').optional()
      .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
], simpleRegister);

router.post('/login', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
], login);

router.post('/register-mobile', [
    check('name', 'Name is required').not().isEmpty(),
    check('mobile', 'Please include a valid 10-digit mobile number').isMobilePhone('en-IN'),
], registerWithMobile);

router.post('/login-mobile', [
    check('mobile', 'Please include a valid 10-digit mobile number').isMobilePhone('en-IN'),
], loginWithMobile);

router.post('/verify-otp', [
    check('mobile', 'Please include a valid 10-digit mobile number').isMobilePhone('en-IN'),
    check('otp', 'OTP must be a 6-digit number').isLength({ min: 6, max: 6 }).isNumeric(),
], verifyOtp);

// ✅ ADD THESE 3 ROUTES:

// Step 1: Verify GSTIN before registration
router.post('/verify-gstin', [
  body('gstin').notEmpty().withMessage('GSTIN is required')
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GSTIN format'),
  body('consent').isBoolean().withMessage('Consent is required')
], verifyGSTINOnly);

// Step 5: Confirm GSTIN consent (after login) - Protected route
router.post('/confirm-gstin-consent', protect, [
  body('consent').isBoolean().withMessage('Consent is required')
], confirmGSTINConsent);

// Step 6: Sign agreement (after consent) - Protected route
router.post('/sign-agreement', protect, [
  body('legalName').notEmpty().withMessage('Legal name is required'),
  body('gstin').notEmpty().withMessage('GSTIN is required'),
  body('termsAccepted').isBoolean().withMessage('Terms must be accepted')
], signAgreement);


router.post('/agreement/send-otp', protect, sendAgreementOtp);

// ✅ NEW ROUTE: Verify OTP to view agreement (Protected route)
router.post('/agreement/verify-otp', protect, [
    body('otp', 'Security code must be a 6-digit number').isLength({ min: 6, max: 6 }).isNumeric(),
], verifyAgreementOtp);

// router.post('/verify-mobile-otp', [
//     check('mobile', 'Please include a valid 10-digit mobile number').isMobilePhone('en-IN'),
//     check('otp', 'OTP must be a 6-digit number').isLength({ min: 6, max: 6 }).isNumeric(),
// ], verifyMobileOtp);
router.post('/verify-mobile-otp', verifyMobileOtp);
router.post('/resend-mobile-otp', [
    check('mobile', 'Please include a valid 10-digit mobile number').isMobilePhone('en-IN'),
], resendMobileOtp);
export default router;