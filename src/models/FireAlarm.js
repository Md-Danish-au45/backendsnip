// models/FireAlarm.js
import mongoose from "mongoose";

const FireAlarmSchema = new mongoose.Schema(
  {
    devId: { type: String, required: true, index: true },

    roomNo: { type: String, default: "" },   // ✅ NEW
    button: { type: Boolean, default: false }, // ✅ NEW

    smoke: Boolean,
    fire: Boolean,

    state: {
      type: String,
      enum: ["SAFE", "ARMED", "ALARM"],
      default: "SAFE",
    },

    ack: { type: Boolean, default: true },

    ackUser: { type: String, default: "" }, // ✅ NEW (for response)
    eventTime: { type: Date, required: true },

    armedAt: { type: Date },

    acknowledgedAt: Date,
    acknowledgedBy: String,
  },
  { timestamps: true }
);

export default mongoose.model("FireAlarm", FireAlarmSchema);
