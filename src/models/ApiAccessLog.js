import mongoose from "mongoose";

const ApiAccessLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  apiKey: { type: String, required: true },
  endpoint: { type: String, required: true },
  method: { type: String, required: true },
  ip: { type: String },
  userAgent: { type: String },
  success: { type: Boolean, default: true },
  statusCode: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

const ApiAccessLog = mongoose.model("ApiAccessLog", ApiAccessLogSchema);
export default ApiAccessLog;
