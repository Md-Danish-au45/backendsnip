import mongoose from "mongoose";

const FireAlarmSchema = new mongoose.Schema(
  {
    devId: { type: String, required: true, index: true },
    roomNo: { type: String, default: "" },

    button: { type: Boolean, default: false },
    smoke: { type: Boolean, default: false },
    fire: { type: Boolean, default: false },

    state: {
      type: String,
      enum: ["SAFE", "ARMED", "ALARM"],
      default: "SAFE",
    },

    ack: { type: Boolean, default: true },
    ackUser: { type: String, default: "" },

    eventTime: { type: Date, required: true },

    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("FireAlarm", FireAlarmSchema);
