// models/FireAlarm.js
import mongoose from "mongoose";

const FireAlarmSchema = new mongoose.Schema(
  {
    devId: { type: String, required: true, index: true },

    smoke: { type: Boolean, default: false },
    fire: { type: Boolean, default: false },

    // system state
    state: {
      type: String,
      enum: ["SAFE", "ARMED", "ALARM"],
      default: "SAFE",
    },

    ack: { type: Boolean, default: true },

    eventTime: { type: Date, required: true },

    armedAt: { type: Date }, // when system entered ARMED

    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("FireAlarm", FireAlarmSchema);
