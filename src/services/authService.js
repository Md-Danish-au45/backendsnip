
import User from '../models/UserModel.js';
import sendEmail from '../utils/sendEmail.js';
import sendSms from '../utils/sendSms.js';
import crypto from 'crypto';
import generateToken from '../utils/generateToken.js';
import { verifyFirebaseToken } from '../utils/firebaseAdmin.js';

// Professional Email Templates
const getEmailVerificationTemplate = (otp, userName) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px;
                color: #333;
            }
            
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
            }
            
            .header h1 {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 10px;
            }
            
            .header p {
                font-size: 16px;
                opacity: 0.9;
            }
            
            .content {
                padding: 40px 30px;
            }
            
            .greeting {
                font-size: 18px;
                margin-bottom: 20px;
                color: #374151;
            }
            
            .message {
                font-size: 16px;
                line-height: 1.6;
                color: #6b7280;
                margin-bottom: 30px;
            }
            
            .otp-container {
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border-radius: 15px;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
                border: 2px solid #e5e7eb;
            }
            
            .otp-label {
                font-size: 14px;
                color: #6b7280;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .otp-code {
                font-size: 36px;
                font-weight: 800;
                color: #4f46e5;
                font-family: 'Courier New', monospace;
                letter-spacing: 8px;
                margin: 10px 0;
                text-shadow: 0 2px 4px rgba(79, 70, 229, 0.1);
            }
            
            .otp-note {
                font-size: 14px;
                color: #9ca3af;
                margin-top: 15px;
            }
            
            .warning {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 15px 20px;
                margin: 20px 0;
                border-radius: 5px;
            }
            
            .warning p {
                color: #92400e;
                font-size: 14px;
                margin: 0;
            }
            
            .footer {
                background: #f9fafb;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
            }
            
            .footer p {
                color: #6b7280;
                font-size: 14px;
                line-height: 1.5;
            }
            
            .support-link {
                color: #4f46e5;
                text-decoration: none;
                font-weight: 600;
            }
            
            .support-link:hover {
                text-decoration: underline;
            }
            
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 15px;
                }
                
                .header {
                    padding: 30px 20px;
                }
                
                .content {
                    padding: 30px 20px;
                }
                
                .otp-code {
                    font-size: 28px;
                    letter-spacing: 4px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✉️ Email Verification</h1>
                <p>Secure your account with this verification code</p>
            </div>
            
            <div class="content">
                <div class="greeting">
                    Hello ${userName || 'there'}! 👋
                </div>
                
                <div class="message">
                    Thank you for signing up! To complete your registration and secure your account, 
                    please verify your email address using the One-Time Password below.
                </div>
                
                <div class="otp-container">
                    <div class="otp-label">Your Verification Code</div>
                    <div class="otp-code">${otp}</div>
                    <div class="otp-note">⏰ This code expires in 10 minutes</div>
                </div>
                
                <div class="warning">
                    <p>
                        🔒 <strong>Security Notice:</strong> Never share this code with anyone. 
                        Our team will never ask for your verification code.
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p>
                    Need help? Contact our support team at 
                    <a href="mailto:info@bringmark.com" class="support-link">info@bringmark.com</a>
                </p>
                <p style="margin-top: 15px; color: #9ca3af;">
                    This is an automated message. Please do not reply to this email.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
};

const getPasswordResetTemplate = (resetUrl, userName) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px;
                color: #333;
            }
            
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
            }
            
            .header h1 {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 10px;
            }
            
            .header p {
                font-size: 16px;
                opacity: 0.9;
            }
            
            .content {
                padding: 40px 30px;
            }
            
            .greeting {
                font-size: 18px;
                margin-bottom: 20px;
                color: #374151;
            }
            
            .message {
                font-size: 16px;
                line-height: 1.6;
                color: #6b7280;
                margin-bottom: 30px;
            }
            
            .reset-button {
                display: inline-block;
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 50px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 20px 0;
                box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
                transition: all 0.3s ease;
            }
            
            .reset-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
            }
            
            .button-container {
                text-align: center;
                margin: 30px 0;
            }
            
            .backup-link {
                background: #f9fafb;
                border: 2px solid #e5e7eb;
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
                word-break: break-all;
            }
            
            .backup-link p {
                color: #6b7280;
                font-size: 14px;
                margin-bottom: 10px;
            }
            
            .backup-link a btns {
                color: #4f46e5;
                font-size: 12px;
                font-family: monospace;
            }
            
            .warning {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 15px 20px;
                margin: 20px 0;
                border-radius: 5px;
            }
            
            .warning p {
                color: #92400e;
                font-size: 14px;
                margin: 0;
            }
            
            .footer {
                background: #f9fafb;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
            }
            
            .footer p {
                color: #6b7280;
                font-size: 14px;
                line-height: 1.5;
            }
            
            .support-link {
                color: #4f46e5;
                text-decoration: none;
                font-weight: 600;
            }
            
            .support-link:hover {
                text-decoration: underline;
            }
            
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 15px;
                }
                
                .header, .content {
                    padding: 30px 20px;
                }
                
                .reset-button {
                    padding: 14px 28px;
                    font-size: 15px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔒 Password Reset</h1>
                <p>Reset your password securely</p>
            </div>
            
            <div class="content">
                <div class="greeting">
                    Hello ${userName || 'there'}! 👋
                </div>
                
                <div class="message">
                    We received a request to reset your password. If you made this request, 
                    click the button below to create a new password. If you didn't request this, 
                    you can safely ignore this email.
                </div>
                
                <div class="button-container">
                    <a href="${resetUrl}" class="btns">
                        🔄 Reset My Password
                    </a>
                </div>
                
                <div class="backup-link">
                    <p><strong>Button not working?</strong> Copy and paste this link into your browser:</p>
                    <a href="${resetUrl}">${resetUrl}</a>
                </div>
                
                <div class="warning">
                    <p>
                        🔒 <strong>Security Notice:</strong> This link expires in 1 hour for your security. 
                        If you didn't request this reset, please contact our support team immediately.
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p>
                    Need help? Contact our support team at 
                    <a href="mailto:info@bringmark.com" class="support-link">info@bringmark.com</a>
                </p>
                <p style="margin-top: 15px; color: #9ca3af;">
                    This is an automated message. Please do not reply to this email.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export const registerUser = async (userData) => {
  const { name, email, password } = userData;
  let user = await User.findOne({ email });
  if (user && user.isVerified) {
    throw new Error('User with this email already exists and is verified.');
  }
  if (user && !user.isVerified) {
  } else {
    user = await User.create({ name, email, password, role: 'user' });
  }
  const otp = user.getEmailOtp();
  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: '🔐 Email Verification Required - Your OTP Code',
      text: `Your One-Time Password (OTP) for email verification is: ${otp}\nThis OTP is valid for 10 minutes.`,
      html: getEmailVerificationTemplate(otp, user.name)
    });
    return { message: `An OTP has been sent to ${user.email}. Please verify your email.` };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('User registered, but failed to send verification OTP.');
  }
};

// VERIFY EMAIL WITH OTP
export const verifyEmailWithOtp = async (verificationData) => {
  const { email, otp } = verificationData;

  const user = await User.findOne({
    email,
    emailOtp: otp,
    emailOtpExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new Error('Invalid or expired OTP. Please request a new one.');
  }

  user.isVerified = true;
  user.emailOtp = undefined;
  user.emailOtpExpires = undefined;
  await user.save();

  const token = generateToken(user._id, user.role);

  // Return the full user object along with the token
  const userObject = user.toObject();
  delete userObject.password; // Ensure password hash is not sent

  return {
    ...userObject, // Spread all fields from the user object
    token,
    message: 'Email verified successfully.'
  };
};

// forgot/reset password
export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    return { message: 'If a user with that email exists, a password reset link has been sent.' };
  }
  const resetToken = user.getPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  try {
    await sendEmail({ 
      to: user.email, 
      subject: '🔒 Password Reset Request - Secure Link Inside', 
      text: `You are receiving this email because you (or someone else) has requested the reset of a password. Please click the link to reset your password: ${resetUrl}`,
      html: getPasswordResetTemplate(resetUrl, user.name)
    });
    return { message: 'If a user with that email exists, a password reset link has been sent.' };
  } catch (error) {
    console.error(error);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new Error('Email could not be sent');
  }
};

export const resetPassword = async (token, password) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } });
  if (!user) {
    throw new Error('Invalid or expired password reset token.');
  }
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  return { message: 'Password has been reset successfully.' };
};

// LOGIN WITH GOOGLE
export const loginWithGoogle = async (token) => {
  const firebaseUser = await verifyFirebaseToken(token);
  if (!firebaseUser) throw new Error('Invalid or expired Google sign-in token');

  let user = await User.findOne({ email: firebaseUser.email });
  if (user) {
    if (!user.googleId) {
      user.googleId = firebaseUser.uid;
      await user.save();
    }
  } else {
    user = await User.create({
      googleId: firebaseUser.uid,
      name: firebaseUser.name,
      email: firebaseUser.email,
      isVerified: firebaseUser.email_verified,
      role: 'user',
    });
  }

  const jwtToken = generateToken(user._id, user.role);

  // Return the full user object
  const userObject = user.toObject();
  delete userObject.password;

  return { ...userObject, token: jwtToken };
};

export const registerUserWithMobile = async (userData) => {
  const { name, mobile } = userData;
  const userExists = await User.findOne({ mobile });
  if (userExists) throw new Error('User with this mobile number already exists');
  const user = new User({ name, mobile, role: 'user' });
  const otp = user.getMobileOtp();
  await user.save();
  try {
    await sendSms(mobile, `Your OTP for registration is: ${otp}`);
    return { message: `OTP sent to ${mobile}` };
  } catch (error) {
    console.error('SMS sending failed:', error);
    throw new Error('User registered, but failed to send OTP.');
  }
};

export const loginUserWithMobile = async (loginData) => {
  const { mobile } = loginData;
  const user = await User.findOne({ mobile });
  if (!user) throw new Error('User with this mobile number not found');
  const otp = user.getMobileOtp();
  await user.save();
  try {
    await sendSms(mobile, `Your OTP for login is: ${otp}`);
    return { message: `OTP sent to ${mobile}` };
  } catch (error) {
    console.error('SMS sending failed:', error);
    throw new Error('Failed to send OTP. Please try again.');
  }
};

// VERIFY OTP AND LOGIN (MOBILE)
export const verifyOtpAndLogin = async (verificationData) => {
  const { mobile, otp } = verificationData;
  const user = await User.findOne({
    mobile,
    mobileOtp: otp,
    mobileOtpExpires: { $gt: Date.now() },
  });

  if (!user) throw new Error('Invalid or expired OTP');

  user.isVerified = true;
  user.mobileOtp = undefined;
  user.mobileOtpExpires = undefined;
  await user.save();

  const token = generateToken(user._id, user.role);

  //Return the full user object
  const userObject = user.toObject();
  delete userObject.password;

  return { ...userObject, token };
};


export const loginUser = async (loginData) => {
  const { email, password } = loginData;

  // Use .select('+password') to include the password field for comparison
  // NOTE: If gstinDetails is set to 'select: false' in your User Model, 
  // you must explicitly select it here as well, e.g., .select('+password +gstinDetails')
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Email verification check
  if (!user.isVerified) {
    throw new Error('Please verify your email address before logging in. Check your inbox for verification link.');
  }
  
  // Password existence and match checks
  if(!user.password){
    await User.findByIdAndDelete(user._id);
    throw new Error('Account removed due to incomplete setup. Please register again.');
  }
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken(user._id, user.role);

  // --- ✅ FIX STARTS HERE ---

  // 1. Convert Mongoose Document to plain object (removes Mongoose clutter)
  const userObject = user.toObject();
  
  // 2. Remove sensitive data (like the hashed password)
  delete userObject.password; 
  
  // 3. Return the token and the full user object (which now includes gstinDetails
  //    because it was part of the original Mongoose document, unless excluded by select: false).
  //    We are returning the entire userObject now.
  
  // FINAL RETURN:
  return { 
      token, 
      user: userObject // ✅ userObject now contains gstinDetails
  };
};



export const sendVerificationEmail = async (email, verificationUrl, userName) => {
  const emailOptions = {
    to: email,
    subject: 'Verify Your Email - VerifyeKYC',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">VerifyeKYC</h1>
          <p style="color: #666; margin: 5px 0;">Trusted Verification For A Digital World</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Welcome to VerifyeKYC, ${userName}!</h2>
          <p style="color: #374151; line-height: 1.6;">
            Thank you for registering with us. To complete your account setup and ensure security, 
            please verify your email address by clicking the button below.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">
            <strong>Important:</strong> This verification link will expire in 24 hours for security reasons.
          </p>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 12px; margin: 20px 0;">
            <p style="color: #92400e; font-size: 13px; margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="word-break: break-all;">${verificationUrl}</span>
            </p>
          </div>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <p style="color: #6b7280; font-size: 14px;">
            If you didn't create an account with VerifyeKYC, please ignore this email and no action is required.
          </p>
          
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
            © 2024 VerifyeKYC. All rights reserved.<br>
            This is an automated email. Please do not reply.
          </p>
        </div>
      </div>
    `,
    text: `
      Welcome to VerifyeKYC, ${userName}!
      
      Thank you for registering with us. Please verify your email address by visiting the following link:
      
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account with VerifyeKYC, please ignore this email.
      
      © 2025 VerifyeKYC. All rights reserved.
    `
  };

  await sendEmail(emailOptions);
};



// ✅ NEW SERVICE FUNCTION: Send Agreement OTP
export const sendAgreementOtp = async (email, userName) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }

  // Generate and save new OTP
  const otp = user.getAgreementOtp();
  await user.save({ validateBeforeSave: false }); // Skip validation for speed

  try {
    // Re-use or create a new template specifically for Agreement access
    await sendEmail({
      to: user.email,
      subject: '🔒 Security Code to View Signed Agreement',
      text: `Your One-Time Password (OTP) to view the agreement is: ${otp}\nThis OTP is valid for 5 minutes.`,
      html: getEmailVerificationTemplate(otp, userName) // You might create a new template here
    });
    return { message: 'Agreement OTP sent successfully.' };
  } catch (error) {
    console.error('Agreement OTP email failed:', error);
    throw new Error('Failed to send security code. Please try again.');
  }
};


// ✅ NEW SERVICE FUNCTION: Verify Agreement OTP
export const verifyAgreementOtp = async (verificationData) => {
  const { email, otp } = verificationData;

  const user = await User.findOne({
    email,
    agreementOtp: otp,                                      // <-- नया फ़ील्ड चेक
    agreementOtpExpires: { $gt: Date.now() },               // <-- नया फ़ील्ड चेक
  });

  if (!user) {
    throw new Error('Invalid or expired security code.');
  }

  // Clear the OTP fields after successful verification
  user.agreementOtp = undefined;
  user.agreementOtpExpires = undefined;
  await user.save({ validateBeforeSave: false });

  // Do NOT generate a new JWT token. This only grants temporary access.
  return { 
      message: 'Security code verified. Access granted.',
      user: { id: user._id, email: user.email }
  };
};