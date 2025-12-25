import { validationResult } from 'express-validator';
import * as authService from '../services/authService.js';
import Service from '../models/Service.js';
import User from '../models/UserModel.js';
import { sendVerificationEmail } from '../services/authService.js';
import * as gridlines from '../services/gridLinesService.js';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';
import * as pdfService from '../services/pdfService.js';
import SMSService from '../services/smsService.js';

export const verifyEmailOtp = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const result = await authService.verifyEmailWithOtp(req.body);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const forgotPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const result = await authService.forgotPassword(req.body.email);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const resetPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { token, password } = req.body;
        const result = await authService.resetPassword(token, password);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
export const simpleRegister = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, mobile, gstin, mobileVerified } = req.body;
    if (!mobileVerified) {
        return res.status(400).json({
            success: false,
            message: "Please verify your mobile number before registration"
        });
    }

    try {
        // Check duplicate
        const existingUser = await User.findOne({ 
            $or: [
                ...(email ? [{ email }] : []),
                ...(mobile ? [{ mobile }] : []),
                ...(gstin ? [{ 'gstinDetails.gstin': gstin.toUpperCase() }] : [])
            ] 
        });

        
        
        if (existingUser) {
            let reason = "";
            if (email && existingUser.email === email) reason = "email";
            else if (mobile && existingUser.mobile === mobile) reason = "mobile";
            else if (gstin && existingUser.gstinDetails?.gstin === gstin.toUpperCase()) reason = "gstin";

            const message =
                reason === "email"
                    ? "This email is already registered. Please log in instead."
                    : reason === "mobile"
                    ? "This mobile number is already registered. Please log in instead."
                    : reason === "gstin"
                    ? "This GSTIN is already registered with VerifyeKYC. Please use a different GSTIN or log in."
                    : "User already exists.";

            return res.status(400).json({
                success: false,
                message,
                reason,
            });
        }

        // ✅ If GSTIN provided, verify it
        let gstinDetails = null;
        let businessName = name;
        let gstMobile = null;
        let gstEmail = null;
        
        if (gstin) {
            try {
                const gstinData = await gridlines.verifyGSTIN(gstin);
                
                if (!gstinData || !gstinData.gstin_data) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid GSTIN or verification failed"
                    });
                }

                const gstInfo = gstinData.gstin_data;
                
                // Extract business details
                businessName = gstInfo.legal_name || gstInfo.trade_name || name;
                gstEmail = gstInfo.principal_address?.email;
                gstMobile = gstInfo.principal_address?.mobile;
                
                gstinDetails = {
                    gstin: gstin.toUpperCase(),
                    legalName: gstInfo.legal_name,
                    tradeName: gstInfo.trade_name,
                    businessType: gstInfo.constitution_of_business,
                    address: gstInfo.principal_address?.address,
                    gstStatus: gstInfo.status === 'Active' ? 'Active' : 'Cancelled',
                    email: gstEmail,
                    mobile: gstMobile,
                    directors: gstInfo.directors || []
                };

                // Auto-fill email/mobile from GSTIN if not provided
                if (!email && gstEmail) {
                    req.body.email = gstEmail;
                }
                if (!mobile && gstMobile) {
                    req.body.mobile = gstMobile;
                }
                
            } catch (gstinError) {
                console.error("❌ GSTIN Error:", gstinError);
                return res.status(400).json({
                    success: false,
                    message: gstinError.message || "GSTIN verification failed"
                });
            }
        }

        // Create user
        const finalMobile = mobile || req.body.mobile || gstMobile;
        const finalEmail = email || req.body.email || gstEmail;

        const user = new User({ 
            name: businessName,
            email: finalEmail, 
            password, 
            mobile: finalMobile,
            isBusinessUser: !!gstin,
            role: gstin ? 'business' : 'user',
            gstinDetails: gstinDetails
        });

        if (gstin) {
            user.isActive = false; // Will be true after agreement signing
        }

        // ✅ Generate mobile OTP if mobile exists
        let mobileOtp = null;
        if (finalMobile) {
            mobileOtp = user.getMobileOtp();

            // Send OTP via AuthKey
            try {
                const smsResult = await SMSService.sendOTP(finalMobile, mobileOtp);
            } catch (smsError) {
                console.error("❌ SMS sending failed:", smsError);
                // Continue registration even if SMS fails
            }
        }

        // ✅ Generate email verification token if email exists
        let verificationToken = null;
        let verificationUrl = null;
        if (finalEmail) {
            verificationToken = user.getEmailVerificationToken();
            verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
        }

        // Save user
        await user.save({ validateBeforeSave: false });

        // Send verification email if email exists
        if (finalEmail && verificationToken) {
            try {
                await sendVerificationEmail(finalEmail, verificationUrl, user.name);
            } catch (emailError) {
                console.error("❌ Email sending failed:", emailError);
            }
        }

        return res.status(201).json({
            success: true,
            message: gstin 
                ? "Business registered successfully with GSTIN. Please verify your mobile OTP and email."
                : "User registered successfully. Please verify your mobile OTP" + (finalEmail ? " and email." : "."),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                isBusinessUser: user.isBusinessUser,
                requiresMobileVerification: !!finalMobile,
                requiresEmailVerification: !!finalEmail,
                ...(gstin && { 
                    gstin: user.gstinDetails.gstin, 
                    businessName: user.gstinDetails.legalName,
                    tradeName: user.gstinDetails.tradeName,
                    businessType: user.gstinDetails.businessType
                })
            },
        });

    } catch (error) {
        console.error("❌ Registration error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const resendMobileOtp = async (req, res) => {
    try {
        const { mobile } = req.body; 

        // Validation
        if (!mobile || mobile.length !== 10) {
            return res.status(400).json({
                success: false,
                message: "Valid 10-digit mobile number required"
            });
        }

        // Generate OTP (don't save to DB)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Send OTP via SMS
        try {
            const smsResult = await SMSService.sendOTP(mobile, otp);
        } catch (smsError) {
            console.error("❌ SMS sending failed:", smsError);
            throw new Error("Failed to send OTP");
        }

        // Store OTP in temporary cache (Redis recommended, or use memory for now)
        // For simplicity, we'll validate in verifyMobileOtp directly
        
        return res.status(200).json({
            success: true,
            message: "OTP sent successfully",
            tempOtp: otp // ⚠️ ONLY FOR TESTING - Remove in production
        });

    } catch (error) {
        console.error("❌ Resend OTP Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to send OTP"
        });
    }
};

export const verifyMobileOtp = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { mobile, otp } = req.body;
        const otpString = otp.toString();

        // ⚠️ TEMPORARY: Direct OTP validation (replace with Redis/cache in production)
        // For now, accepting any 6-digit OTP for testing
        if (otpString.length !== 6) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP format'
            });
        }

        // TODO: Validate OTP from cache/Redis
        // For now, just return success
        
        return res.status(200).json({
            success: true,
            message: 'Mobile number verified successfully',
            data: {
                mobile: mobile,
                verified: true
            }
        });

    } catch (error) {
        console.error("❌ Mobile OTP Verification Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "OTP verification failed"
        });
    }
};

export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const userData = await authService.loginUser(req.body);
    res.status(200).json({ success: true, data: userData });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};

export const googleSignIn = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { token } = req.body;
        const userData = await authService.loginWithGoogle(token);
        res.status(200).json({ success: true, data: userData });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
};

// PERFECT SOLUTION - No double token generation
export const registerWithMobile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { name, email, mobile, password } = req.body;
  
  try {
    // Check for existing user
    const existingUser = await User.findOne({ 
      $or: [
        ...(email ? [{ email }] : []),
        { mobile }
      ] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email or mobile",
      });
    }

    // Create user instance
    const user = new User({ 
      name, 
      email: email || undefined, // Only set email if provided
      mobile, 
      password: password || undefined // Only set password if provided
    });
    
    // Generate mobile OTP for verification
    const mobileOtp = user.getMobileOtp();
    
    // Generate email verification token ONLY if email is provided
    let verificationToken = null;
    let verificationUrl = null;
    
    if (email) {
      verificationToken = user.getEmailVerificationToken();
      verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    }
    
    // Save user to database
    await user.save({ validateBeforeSave: false });
    
    
    // Send verification email if email was provided
    if (email && verificationToken) {
      try {
        await sendVerificationEmail(email, verificationUrl, name);
      } catch (emailError) {
        console.error("❌ Email sending failed:", emailError);
        // Don't fail the registration if email fails
      }
    }

    return res.status(201).json({
      success: true,
      message: email 
        ? "User registered successfully. Please verify your email and mobile OTP."
        : "User registered successfully. Please verify mobile OTP.",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          isVerified: user.isVerified
        },
        requiresEmailVerification: !!email,
        requiresMobileVerification: true
      }
    });
    
  } catch (error) {
    console.error("❌ Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

// registerWithMobile ke baad add karein

export const registerWithGSTIN = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { gstin, password } = req.body;

  try {
    // Check if GSTIN already exists
    const existingUser = await User.findOne({ 'gstinDetails.gstin': gstin.toUpperCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Business already registered with this GSTIN"
      });
    }

    const gstinData = await gridlines.verifyGSTIN(gstin);

    if (!gstinData) {
      return res.status(400).json({
        success: false,
        message: "Invalid GSTIN or verification failed"
      });
    }

    // ✅ Extract data from GSTIN response
    const businessName = gstinData.legal_name || gstinData.trade_name;
    const email = gstinData.email; // If available from API
    const mobile = gstinData.mobile; // If available from API

    // Create user with GSTIN details
    const user = new User({
      name: businessName,
      email: email || undefined,
      mobile: mobile || undefined,
      password: password,
      isBusinessUser: true,
      role: 'business',
      gstinDetails: {
        gstin: gstin.toUpperCase(),
        legalName: gstinData.legal_name,
        tradeName: gstinData.trade_name,
        businessType: gstinData.business_type,
        address: gstinData.principal_place_of_business,
        gstStatus: gstinData.status === 'Active' ? 'Active' : 'Cancelled',
      }
    });

    // ✅ Generate verification tokens
    let verificationToken = null;
    if (email) {
      verificationToken = user.getEmailVerificationToken();
    }
    
    const mobileOtp = mobile ? user.getMobileOtp() : null;

    await user.save({ validateBeforeSave: false });

    // Send verification email if email exists
    if (email && verificationToken) {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
      try {
        await sendVerificationEmail(email, verificationUrl, businessName);
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
      }
    }

    // TODO: Send SMS OTP if mobile exists
    if (mobile && mobileOtp) {
      console.log("📱 Mobile OTP:", mobileOtp);
    }

    return res.status(201).json({
      success: true,
      message: "Business registered successfully with GSTIN",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          gstin: user.gstinDetails.gstin,
          businessName: user.gstinDetails.legalName,
          isBusinessUser: true
        },
        requiresEmailVerification: !!email,
        requiresMobileVerification: !!mobile
      }
    });

  } catch (error) {
    console.error("❌ GSTIN Registration error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "GSTIN registration failed"
    });
  }
};

export const loginWithMobile = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const result = await authService.loginUserWithMobile(req.body);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
};

export const verifyOtp = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const userData = await authService.verifyOtpAndLogin(req.body);
        res.status(200).json({ success: true, data: userData });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
};

// authController.js

// 1. BACKEND: Fixed authController.js - verifyEmailWithToken function
export const verifyEmailWithToken = async (req, res) => {
  try {
    const { token } = req.params;
    // Hash the token to match with database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with matching hashed token and valid expiration
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid or expired verification token" 
      });
    }

    // Update user verification status
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    // The user.save() operation might throw an error (e.g., Mongoose Validation, Duplicate Key)
    await user.save();
    // Redirect or return success based on your frontend requirement
    // Since this is a backend function, it returns JSON, but in a real app,
    // you might want to redirect to the frontend login page.
    return res.status(200).json({ 
      success: true,
      message: "Email verified successfully!",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isVerified: user.isVerified
        }
      }
    });
    
  } catch (error) {
    // ❌ FIX: Improved Error Handling to pinpoint the issue
    console.error("❌ Email verification failed with a server error:", error);
    
    let errorMessage = "Server error during email verification. Please try again or contact support.";
    let statusCode = 500;

    if (error.name === 'ValidationError') {
      // Mongoose validation error (e.g., required field missing)
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.code === 11000) {
      // MongoDB duplicate key error (E11000)
      const field = Object.keys(error.keyValue)[0];
      errorMessage = `User with this ${field} already exists. Verification failed.`;
      statusCode = 409; // Conflict
    }

    return res.status(statusCode).json({ 
      success: false,
      message: errorMessage 
    });
  }
};


// STEP 1: Verify GSTIN (before registration)
export const verifyGSTINOnly = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { gstin, consent } = req.body;

  if (!consent) {
    return res.status(400).json({
      success: false,
      message: "Consent is required to fetch GSTIN data"
    });
  }

  try {
    const gstinData = await gridlines.verifyGSTIN(gstin);
    
    if (!gstinData || !gstinData.gstin_data) {
      return res.status(400).json({
        success: false,
        message: "Invalid GSTIN or verification failed"
      });
    }

    const gstInfo = gstinData.gstin_data;
    
    return res.status(200).json({
      success: true,
      message: "GSTIN verified successfully",
      data: {
        gstin: gstInfo.document_id,
        legalName: gstInfo.legal_name,
        tradeName: gstInfo.trade_name,
        businessType: gstInfo.constitution_of_business,
        email: gstInfo.principal_address?.email,
        mobile: gstInfo.principal_address?.mobile,
        address: gstInfo.principal_address?.address,
        status: gstInfo.status,
        directors: gstInfo.directors || []
      }
    });

  } catch (error) {
    console.error("❌ GSTIN Verification Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "GSTIN verification failed"
    });
  }
};

// STEP 5: Confirm GSTIN Consent (after login)
export const confirmGSTINConsent = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { consent } = req.body;

    if (!consent) {
      return res.status(400).json({
        success: false,
        message: "Consent is required"
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.isBusinessUser || !user.gstinDetails) {
      return res.status(400).json({
        success: false,
        message: "GSTIN data not found for this user"
      });
    }

    user.gstinConsentGiven = true;
    user.gstinConsentGivenAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Consent recorded successfully",
      data: {
        gstinDetails: user.gstinDetails,
        consentGivenAt: user.gstinConsentGivenAt
      }
    });

  } catch (error) {
    console.error("❌ Consent Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record consent"
    });
  }
};

// STEP 6: Sign Agreement (activate account)

export const signAgreement = async (req, res) => {
  // User variable ko declare kiya gaya hai taaki woh catch block mein bhi available rahe.
  let user; 
  
  try {
    const userId = req.user.id;
    const clientEmail = req.user.email; 
    const adminEmail = process.env.ADMIN_EMAIL || 'support@verifyekyc.com'; 

    const { legalName, tradeName, gstin, signature, agreementText, termsAccepted } = req.body;

    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        message: "You must accept terms and conditions"
      });
    }

    // 1. Fetch user
    user = await User.findById(userId); 
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.gstinConsentGiven) {
      return res.status(400).json({
        success: false,
        message: "Please confirm GSTIN consent first"
      });
    }

    // Prepare agreement data
    const agreementData = {
      legalName,
      tradeName,
      gstin,
      signature,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      agreementText,
      termsAccepted,
      signedAt: new Date(),
      signedBy: user 
    };
    
    // 2. Add Agreement Data & Activate Account
    user.agreement = agreementData;
    user.agreementSigned = true;
    user.isActive = true; // ✅ Account Activated

    // Get all active services
    const allServices = await Service.find({ is_active: true }).select('subcategory category'); 

    const now = new Date();
    // Trial duration: 1 Month
    const expiresAt = new Date(new Date().setMonth(now.getMonth() + 1)); 

    const newTrialSubscriptions = [];
    const processedCategories = new Set(); 

    for (const service of allServices) {
        // Subcategory ko priority dein
        const categoryKey = service.subcategory || service.category;
        
        if (categoryKey && !processedCategories.has(categoryKey)) {
            newTrialSubscriptions.push({
                category: categoryKey,
                planType: 'promotional', 
                usageLimit: 2,           // 🎯 Set to 2 Trial uses (Aapke original request ke according)
                usageCount: 0,
                purchasedAt: now,
                expiresAt: expiresAt,
                isPromotion: true,
            });
            processedCategories.add(categoryKey);
        }
    }

    // Add all new trial subscriptions to user's profile
    user.activeSubscriptions = [...user.activeSubscriptions, ...newTrialSubscriptions];
    // 4. Save ALL changes to the database in a SINGLE CALL (The recommended fix)
    await user.save(); 
    
    // --- 5. PDF GENERATION AND EMAIL LOGIC ---
    try {
        const pdfBuffer = await pdfService.generateAgreementPdf(agreementData); 

        const attachment = {
            filename: `${legalName.replace(/\s/g, '_')}_Service_Agreement.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
        };

        // Send Email to Client
        await sendEmail({
            to: clientEmail,
            subject: `✅ Action Required: VerifyeKYC Agreement Copy & Account Activation`,
            text: `Dear ${legalName}, ... (Text content)`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                    <p>Dear <strong>${legalName}</strong>,</p>
                    <p>We’re pleased to inform you that your <strong>VerifyeKYC Service Agreement</strong> has been successfully signed, and your account is now active.</p>
                    <p>Please find your digitally signed agreement attached to this email for your records.</p>
                    <div style="background-color: #f0fdf4; border: 1px solid #10b981; color: #065f46; padding: 12px; border-radius: 6px; margin: 16px 0;">
                        <strong>Important:</strong> To ensure you continue receiving important updates from us, please move this email from your <em>Junk</em> or <em>Spam</em> folder to your <em>Inbox</em>.
                    </div>
                    <p>Thank you for choosing <strong>VerifyeKYC</strong>.</p>
                    <p>Best regards,<br>
                    <strong>VerifyeKYC Team</strong></p>
                </div>
            `,
            attachments: [attachment],
        });


        // Send Email to Admin
        await sendEmail({
            to: adminEmail,
            subject: `🔔 NEW Agreement Signed: ${legalName} (${gstin})`,
            text: `The client ${legalName} (GSTIN: ${gstin}) has successfully signed the service agreement. Account activated. Find the agreement attached.`,
            html: `<p>The client <strong>${legalName}</strong> (GSTIN: ${gstin}) has successfully signed the service agreement. Account is now active. Find the digitally signed agreement attached.</p>`,
            attachments: [attachment]
        });
        
    } catch (emailPdfError) {
        console.error("❌ PDF generation or email sending failed (DB save was successful):", emailPdfError);
        // Don't fail the HTTP response, as the DB save succeeded.
    }
    // --- END PDF GENERATION AND EMAIL LOGIC ---

    return res.status(200).json({
      success: true,
      message: "Agreement signed successfully. Your account is now active and the agreement has been emailed!",
      data: {
        isActive: user.isActive,
        agreementSignedAt: user.agreement.signedAt
      }
    });

  } catch (error) {
    // This catch block handles errors from DB lookup or validation/save failures.
    console.error("❌ Agreement Error:", error);
    return res.status(500).json({
      success: false,
      // Default error message
      message: "Failed to sign agreement" 
    });
  }
};


export const sendAgreementOtp = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('email name');

    if (!user || !user.email) {
        return res.status(404).json({ success: false, message: "User or email not found." });
    }

    const result = await authService.sendAgreementOtp(user.email, user.name);

    res.status(200).json({ success: true, message: result.message });
    
  } catch (error) {
    console.error("❌ Send Agreement OTP Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to send security code." });
  }
};


// ✅ NEW CONTROLLER: Verify Security Code for Agreement Viewing
export const verifyAgreementOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.user.id;
    const { otp } = req.body;
    
    // Check if the OTP matches the current logged-in user's email
    const user = await User.findById(userId).select('email');
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
    }

    // Call the service function
    const result = await authService.verifyAgreementOtp({ email: user.email, otp });

    res.status(200).json({ success: true, data: result.user, message: result.message });

  } catch (error) {
    console.error("❌ Verify Agreement OTP Error:", error);
    res.status(401).json({ success: false, message: error.message || "Invalid security code." });
  }
};


export const generateAgreementController = async (req, res) => {
    try {
        // 1. Validate Input
        const agreementData = req.body;
        
        if (!agreementData || !agreementData.signature || !agreementData.agreementText || !agreementData.legalName) {
            return res.status(400).json({ message: "Missing required agreement data (Legal Name, signature, or text)." });
        }

        // 2. Generate PDF Buffer using the service logic
        const pdfBuffer = await pdfService.generateAgreementPdf(agreementData);

        // 3. Send the response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Service_Agreement_${agreementData.legalName.replace(/\s/g, '_')}.pdf`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // 4. Send the PDF buffer
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating agreement PDF:', error);
        res.status(500).json({ 
            message: "Failed to generate PDF agreement.",
            error: error.message 
        });
    }
};