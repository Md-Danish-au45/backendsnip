
import axios from 'axios';
import User from '../models/UserModel.js';

class SMSService {
    static async sendOTP(phoneNumber, otpCode) {
        try {
            // Clean phone number
            const cleanPhone = phoneNumber.startsWith('+91')
                ? phoneNumber.slice(3)
                : phoneNumber.startsWith('91') && phoneNumber.length === 12
                ? phoneNumber.slice(2)
                : phoneNumber;

            const response = await axios.get('https://api.authkey.io/request', {
                params: {
                    authkey: process.env.AUTHKEY_API_KEY,
                    sid: process.env.AUTHKEY_SID,
                    mobile: cleanPhone,
                    country_code: '91',
                    otp: otpCode
                },
                timeout: 5000
            });


            if (!response.data || response.data.Message !== 'Submitted Successfully') {
                throw new Error(response.data?.error || 'Failed to submit OTP request');
            }

            return {
                status: 'pending',
                otp: otpCode,
                message: 'OTP sent successfully'
            };

        } catch (error) {
            console.error('❌ AuthKey Error:', error.response?.data || error.message);
            
            // Return pending status even if SMS fails (for development/testing)
            return {
                status: 'pending',
                otp: otpCode,
                message: 'OTP generated (SMS may have failed)'
            };
        }
    }

  static async verifyOTP(phoneNumber, code) {
    try {
        // ✅ Convert to string
        const otpString = code.toString();
        
        const user = await User.findOne({ mobile: phoneNumber });

        if (!user) {
            console.error("❌ User not found:", phoneNumber);
            return { 
                status: 'failed',
                message: 'User not found. Please register first.'
            };
        }

        if (!user.mobileOtp) {
            console.error("❌ No OTP in database for:", phoneNumber);
            return { 
                status: 'failed',
                message: 'No OTP found. Please request a new OTP.'
            };
        }

        // ✅ String comparison
        
        if (user.mobileOtp !== otpString) {
            console.error("❌ OTP mismatch");
            return { 
                status: 'failed',
                message: 'Invalid OTP. Please check and try again.'
            };
        }

        // Check expiry
        if (user.mobileOtpExpires < new Date()) {
            console.error("❌ OTP expired");
            return { 
                status: 'expired',
                message: 'OTP has expired. Please request a new one.'
            };
        }

        return { 
            status: 'approved',
            message: 'OTP verified successfully'
        };

    } catch (error) {
        console.error("❌ Verify OTP Error:", error);
        throw new Error(`Failed to verify OTP: ${error.message}`);
    }
}
}

export default SMSService;
