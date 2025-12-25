import User from '../models/UserModel.js';
// ApiAccessLog import ki zarurat ab nahi hai, kyunki logging ab yahan nahi hogi.

export const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.header("X-API-Key");
    const ip = req.ip || req.connection.remoteAddress;

    if (!apiKey)
      return res.status(401).json({ success: false, message: "API key missing" });

    if (!apiKey.startsWith("vmk_"))
      return res.status(401).json({ success: false, message: "Invalid API key format" });

    // 1. Find User
    const user = await User.findOne({ apiKey }).select('+apiUsageCount +apiAccessLimit'); // Ensure access limits are selected

    if (!user || !user.apiEnabled || user.apiKeySuspended)
      return res.status(403).json({ success: false, message: "API key disabled or suspended" });

    // 2. Limit Check (Just check, don't update usage/save yet)
    if (user.apiUsageCount >= user.apiAccessLimit) {
      // Suspension logic is crucial, but user.save() will be handled by the next middleware/process if needed. 
      // For a quick fix here: If limit exceeded, deny access immediately.
      return res.status(429).json({
        success: false,
        message: "API usage limit exceeded. Contact admin to renew your plan."
      });
    }

    // 3. Suspicious activity check (Only flag the user, don't increment usage here)
    if (user.lastIp && user.lastIp !== ip) {
      user.suspiciousActivity = true;
      // Note: We don't save the user here. Saving is deferred to the logging middleware or a background task.
    }
    
    // 4. Attach user object to request
    req.user = user;
    req.apiKey = apiKey; // Attach key for the logging middleware

    // 5. Success: Proceed to the next middleware (logging/checkSubscription)
    next();
  } catch (error) {
    console.error("API key auth error:", error);
    res.status(500).json({ success: false, message: "Internal server error during authentication" });
  }
};

export const protectAdmin = (req, res, next) => {
  if (!req.user || !["admin", "superadmin"].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
};

export default authenticateApiKey;
