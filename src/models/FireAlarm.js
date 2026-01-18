// models/FireAlarm.js
import mongoose from "mongoose";

const FireAlarmSchema = new mongoose.Schema(
  {
    devId: { type: String, required: true, index: true },

    // spec: button pressed
    button: { type: Boolean, default: false },

    // ack fields (spec response)
    ack: { type: Boolean, default: false, index: true },
    ackUser: { type: String, default: "" },
    ackAt: { type: Date, default: null },

    // device event time
    eventTime: { type: Date, required: true },

    // optional: store extra info later (smoke/fire etc)
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

// helpful index: latest active alarm per device quickly
FireAlarmSchema.index({ devId: 1, ack: 1, createdAt: -1 });

export default mongoose.model("FireAlarm", FireAlarmSchema);
