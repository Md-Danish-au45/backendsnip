import ApiAccessLog from '../models/ApiAccessLog.js';
import User from '../models/UserModel.js'; 

export const apiLoggingMiddleware = (req, res, next) => {
    
    if (!req.user || !req.apiKey) {
        // If authentication failed, skip logging this path.
        return next(); 
    }

    const startTime = Date.now();
    const userId = req.user._id; // Capture ID before execution

    // 1. Setup response finish listener for logging and counting
    res.on('finish', async () => {
        const endTime = Date.now();
        const statusCode = res.statusCode;
        // Successful logging only for status codes below 400 (or if explicitly logging errors)
        const success = statusCode >= 200 && statusCode < 400;

        // Final check for user ID (in case context was lost, though unlikely)
        if (!userId) {
             console.error('API Logging Failed: User ID context lost.'); 
             return; 
        }

        try {
            // A) Increment API usage count and update last used time
            await User.findByIdAndUpdate(userId, {
                $inc: { apiUsageCount: 1 },
                apiKeyLastUsed: new Date(),
                // Last IP is updated here (as this is the official usage point)
                lastIp: req.ip || req.headers['x-forwarded-for']?.split(',').shift() || req.connection.remoteAddress,
                // Suspicious activity check should ideally happen in auth, but saving here is okay
                $set: { 
                  suspiciousActivity: req.user.lastIp && req.user.lastIp !== req.ip ? true : req.user.suspiciousActivity 
                } 
            });
            
            // B) Create the API Log entry
            await ApiAccessLog.create({
                user: userId,
                apiKey: req.apiKey,
                endpoint: req.originalUrl,
                method: req.method,
                ip: req.ip || req.headers['x-forwarded-for']?.split(',').shift() || req.connection.remoteAddress,
                userAgent: req.headers['user-agent'],
                success: success,
                statusCode: statusCode,
                durationMs: endTime - startTime, // Logging response time
            });
            console.log(`✅ API Logged: User ${userId} | Status: ${statusCode}`);

        } catch (error) {
            // Log creation fail hua hai
            console.error(`🚨 API LOG CRITICAL ERROR for User ${userId}:`, error.message);
        }
    });

    next(); // Pass control to the next middleware/controller
};
