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

    // latest alarm (for state only)
    const lastAlarm = await FireAlarm.findOne({ devId: devid })
      .sort({ createdAt: -1 });

    const now = Date.now();

    // ─────────────────────────────────────
    // 1️⃣ FIRST ALARM EVER
    // ─────────────────────────────────────
    if (!lastAlarm) {
      const first = await FireAlarm.create({
        devId: devid,
        smoke,
        fire,
        state: danger ? "ALARM" : "SAFE",
        ack: !danger,
        eventTime,
        armedAt: !danger ? new Date() : null,
      });

      return res.json({
        success: true,
        newAlarm: true,
        alarmId: first._id,
        state: first.state,
        ack: first.ack,
      });
    }

    let systemState = lastAlarm.state;

    // ─────────────────────────────────────
    // 2️⃣ SAFE → ARMED after 5 min
    // ─────────────────────────────────────
    if (systemState === "SAFE") {
      const safeMinutes =
        (now - new Date(lastAlarm.armedAt || lastAlarm.updatedAt).getTime()) / 60000;

      if (safeMinutes >= ARM_DELAY_MINUTES) {
        systemState = "ARMED";
      }
    }

    // ─────────────────────────────────────
    // 3️⃣ ARMED + danger → CREATE NEW ALARM
    // ─────────────────────────────────────
    if (systemState === "ARMED" && danger) {
      const newAlarm = await FireAlarm.create({
        devId: devid,
        smoke,
        fire,
        state: "ALARM",
        ack: false,
        eventTime,
      });

      return res.json({
        success: true,
        newAlarm: true,
        alarmId: newAlarm._id,
        state: "ALARM",
        ack: false,
      });
    }

    // ─────────────────────────────────────
    // 4️⃣ OTHERWISE → update last record only
    // ─────────────────────────────────────
    lastAlarm.smoke = smoke;
    lastAlarm.fire = fire;
    lastAlarm.eventTime = eventTime;

    // keep state & ack
    await lastAlarm.save();

    return res.json({
      success: true,
      newAlarm: false,
      alarmId: lastAlarm._id,
      state: lastAlarm.state,
      ack: lastAlarm.ack,
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
