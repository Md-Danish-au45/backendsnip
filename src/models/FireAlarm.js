// models/FireAlarm.js
import mongoose from "mongoose";

const FireAlarmSchema = new mongoose.Schema(
  {
    devId: { type: String, required: true, index: true },

    smoke: Boolean,
    fire: Boolean,

    state: {
      type: String,
      enum: ["SAFE", "ARMED", "ALARM"],
      default: "SAFE",
    },

    ack: { type: Boolean, default: true },

    eventTime: { type: Date, required: true },

    armedAt: { type: Date },

    acknowledgedAt: Date,
    acknowledgedBy: String,
  },
  { timestamps: true }
);

export default mongoose.model("FireAlarm", FireAlarmSchema);
