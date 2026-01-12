import FireAlarm from "../models/FireAlarm.js";

const COOLDOWN_MINUTES = 5;

// POST /firealm
const ARM_DELAY_MINUTES = 5;

// 🔥 DEVICE → SERVER
export const handleFireAlarm = async (req, res) => {
  try {
    const { devid, smoke, fire, time } = req.body;

    if (!devid || typeof smoke !== "boolean" || typeof fire !== "boolean" || !time) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    const eventTime = new Date(time);
    const danger = smoke || fire;

    // fetch latest state of device
    let alarm = await FireAlarm.findOne({ devId: devid })
      .sort({ createdAt: -1 });

    // ─────────────────────────────────────────
    // FIRST RECORD
    // ─────────────────────────────────────────
    if (!alarm) {
      const state = danger ? "ALARM" : "SAFE";

      const first = await FireAlarm.create({
        devId: devid,
        smoke,
        fire,
        state,
        ack: !danger,
        eventTime,
        armedAt: !danger ? new Date() : null,
      });

      return res.json({
        success: true,
        state: first.state,
        ack: first.ack,
      });
    }

    // ─────────────────────────────────────────
    // EXISTING DEVICE LOGIC
    // ─────────────────────────────────────────
    const now = Date.now();
    let newState = alarm.state;
    let ack = alarm.ack;

    // ========== STATE: SAFE ==========
    if (alarm.state === "SAFE") {
      const safeMinutes =
        (now - new Date(alarm.armedAt || alarm.updatedAt).getTime()) / 60000;

      // after 5 min → ARMED
      if (safeMinutes >= ARM_DELAY_MINUTES) {
        newState = "ARMED";
      }
    }

    // ========== STATE: ARMED ==========
    if (newState === "ARMED") {
      if (danger) {
        // 🚨 C++ RULE
        newState = "ALARM";
        ack = false;
      }
    }

    // ========== STATE: ALARM ==========
    if (newState === "ALARM") {
      ack = false;
    }

    // update record
    alarm.smoke = smoke;
    alarm.fire = fire;
    alarm.state = newState;
    alarm.ack = ack;
    alarm.eventTime = eventTime;

    if (newState === "SAFE" && !alarm.armedAt) {
      alarm.armedAt = new Date();
    }

    await alarm.save();

    return res.json({
      success: true,
      state: alarm.state,
      ack: alarm.ack,
    });
  } catch (err) {
    console.error("Fire alarm error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// PATCH /alarms/:id/ack
export const acknowledgeAlarm = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.body;

    const alarm = await FireAlarm.findById(id);
    if (!alarm) {
      return res.status(404).json({
        success: false,
        message: "Alarm not found",
      });
    }

    // ACK only allowed in ALARM state
    if (alarm.state !== "ALARM") {
      return res.status(400).json({
        success: false,
        message: "Alarm not active",
      });
    }

    alarm.state = "SAFE";
    alarm.ack = true;
    alarm.acknowledgedAt = new Date();
    alarm.acknowledgedBy = user || "system";
    alarm.armedAt = new Date(); // restart timer

    await alarm.save();

    res.json({
      success: true,
      message: "Alarm acknowledged, system SAFE",
      data: {
        state: alarm.state,
        ack: alarm.ack,
      },
    });
  } catch (err) {
    console.error("Acknowledge error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


/**
 * GET /alarms
 * Get all alarms (latest first)
 */
export const getAllAlarms = async (req, res) => {
  try {
    const alarms = await FireAlarm.find()
      .sort({ createdAt: -1 })
      .limit(100); // safety limit

    res.json({
      success: true,
      count: alarms.length,
      data: alarms,
    });
  } catch (err) {
    console.error("Get all alarms error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * GET /alarms/device/:devId
 * Get alarms by device ID
 */
export const getAlarmsByDevice = async (req, res) => {
  try {
    const { devId } = req.params;

    const alarms = await FireAlarm.find({ devId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: alarms.length,
      data: alarms,
    });
  } catch (err) {
    console.error("Get alarms by device error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * GET /alarms/:id
 * Get single alarm by ID
 */
export const getAlarmById = async (req, res) => {
  try {
    const { id } = req.params;

    const alarm = await FireAlarm.findById(id);
    if (!alarm) {
      return res.status(404).json({
        success: false,
        message: "Alarm not found",
      });
    }

    res.json({
      success: true,
      data: alarm,
    });
  } catch (err) {
    console.error("Get alarm by id error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
