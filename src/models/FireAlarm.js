import mongoose from "mongoose";

const fireAlarmSchema = new mongoose.Schema(
  {
    devId: { type: String, required: true, index: true },

    smoke: { type: Boolean, default: false },
    fire: { type: Boolean, default: false },

    // 🔔 Alarm state
    ack: { type: Boolean, default: false },

    // ✅ NEW FIELDS
    acknowledgedAt: { type: Date, default: null },     // time of ack
    acknowledgementMessage: { type: String, default: "" }, // user message
    acknowledgedBy: { type: String, default: "" },     // user/admin name or id

    eventTime: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("FireAlarm", fireAlarmSchema);
