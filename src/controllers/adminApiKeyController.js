import User from "../models/UserModel.js";
import ApiAccessLog from "../models/ApiAccessLog.js";
import { generateApiKey } from "../utils/apiKeyGenerator.js";

export const adminListAllApiKeys = async (req, res) => {
  const users = await User.find(
    { apiKey: { $exists: true } },
    "name email apiKey apiEnabled apiUsageCount apiAccessLimit apiKeyCreatedAt apiKeySuspended suspiciousActivity"
  ).lean();

  res.status(200).json({ success: true, data: users });
};

export const adminSuspendApiKey = async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  user.apiKeySuspended = !user.apiKeySuspended;
  await user.save();

  res.status(200).json({
    success: true,
    message: `API key ${user.apiKeySuspended ? "suspended" : "activated"} successfully`
  });
};

export const adminRegenerateUserApiKey = async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  if (user.apiKey) user.apiKeyHistory.unshift(user.apiKey);
  user.apiKeyHistory = user.apiKeyHistory.slice(0, 3);

  const newKey = generateApiKey();
  user.apiKey = newKey;
  user.apiKeySuspended = false;
  user.apiEnabled = true;
  user.apiUsageCount = 0;
  user.apiKeyCreatedAt = new Date();
  await user.save();

  res.status(200).json({
    success: true,
    message: "New API key generated and activated",
    apiKey: newKey
  });
};

// Change 'adminApiKeyController.js' to use 'userId' if that's the field name in your log model.

export const adminViewApiLogs = async (req, res) => {
  // Assuming the field name in ApiAccessLog model is 'userId'
  const logs = await ApiAccessLog.find({ userId: req.params.userId }) // 👈 Change 'user' to 'userId'
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
    
  console.log(logs,"logs");

  res.status(200).json({
    success: true,
    count: logs.length,
    logs
  });
};
