import axios from 'axios';

const sendSms = async (mobileNumber, message) => {
    try {
        // Clean phone number - remove +91 or leading 91 if present
        const cleanPhone = mobileNumber.startsWith('+91')
            ? mobileNumber.slice(3)
            : mobileNumber.startsWith('91') && mobileNumber.length === 12
            ? mobileNumber.slice(2)
            : mobileNumber;

        // AuthKey API configuration
        const config = {
            params: {
                authkey: process.env.AUTHKEY_API_KEY,
                sid: process.env.AUTHKEY_SID,
                mobile: cleanPhone,
                country_code: '91',
                message: message
            },
            timeout: 5000
        };

        const response = await axios.get('https://api.authkey.io/request', config);

        if (!response.data || response.data.Message !== 'Submitted Successfully') {
            throw new Error(response.data?.error || 'Failed to submit SMS request');
        }

        return {
            success: true,
            message: 'SMS sent successfully',
            data: response.data
        };

    } catch (error) {
        console.error('❌ AuthKey SMS Error:', error.response?.data || error.message);
        
        // Don't throw error - allow registration to continue
        return {
            success: false,
            message: 'SMS sending failed but registration continued',
            error: error.message
        };
    }
};

export default sendSms;
