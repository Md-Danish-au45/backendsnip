import FireAlarm from "../models/FireAlarm.js";

const COOLDOWN_MINUTES = 1;

// POST /firealm


const ARM_DELAY_MINUTES = 1;

export const handleFireAlarm = async (req, res) => {
  try {
    const { devid, button, smoke, fire, time, roomNo } = req.body;

    // ✅ Accept button-based payload (minimum required)
    if (!devid || typeof devid !== "string" || typeof button !== "boolean" || !time) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload. Required: devid(string), button(boolean), time(ISO)",
      });
    }

    const eventTime = new Date(time);
    if (Number.isNaN(eventTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid time format. Must be ISO-8601.",
      });
    }

    // ✅ danger logic (old logic preserved, just includes button)
    const smokeBool = typeof smoke === "boolean" ? smoke : false;
    const fireBool = typeof fire === "boolean" ? fire : false;
    const danger = button === true || smokeBool === true || fireBool === true;

    // latest alarm (for state only)
    const lastAlarm = await FireAlarm.findOne({ devId: devid }).sort({ createdAt: -1 });
    const now = Date.now();

    // ─────────────────────────────────────
    // 1️⃣ FIRST ALARM EVER
    // ─────────────────────────────────────
    if (!lastAlarm) {
      const first = await FireAlarm.create({
        devId: devid,
        roomNo: roomNo || "",      // ✅ room store
        button,
        smoke: smokeBool,
        fire: fireBool,
        state: danger ? "ALARM" : "SAFE",
        ack: !danger,
        ackUser: "",               // ✅ for response
        eventTime,
        armedAt: !danger ? new Date() : null,
      });

      return res.json({
        success: true,
        ack: first.ack,
        ackUser: first.ackUser || "",
        dateTime: first.eventTime?.toISOString?.() || "",
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
        roomNo: roomNo || lastAlarm.roomNo || "", // ✅ keep room
        button,
        smoke: smokeBool,
        fire: fireBool,
        state: "ALARM",
        ack: false,
        ackUser: "",
        eventTime,
      });

      return res.json({
        success: true,
        ack: newAlarm.ack,          // false
        ackUser: newAlarm.ackUser,  // ""
        dateTime: newAlarm.eventTime?.toISOString?.() || "",
      });
    }

    // ─────────────────────────────────────
    // 4️⃣ OTHERWISE → update last record only
    // ─────────────────────────────────────
    lastAlarm.button = button;      // ✅ update button
    lastAlarm.smoke = smokeBool;
    lastAlarm.fire = fireBool;
    lastAlarm.eventTime = eventTime;
    if (roomNo) lastAlarm.roomNo = roomNo; // ✅ update room if sent

    await lastAlarm.save();

    return res.json({
      success: true,
      ack: lastAlarm.ack,
      ackUser: lastAlarm.ackUser || "",
      dateTime: lastAlarm.eventTime?.toISOString?.() || "",
    });
  } catch (err) {
    console.error("Fire alarm error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const acknowledgeAlarm = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.body;

    const alarm = await FireAlarm.findById(id);
    if (!alarm) {
      return res.status(404).json({ success: false, message: "Alarm not found" });
    }

    if (alarm.state !== "ALARM") {
      return res.status(400).json({ success: false, message: "Alarm not active" });
    }

    alarm.state = "SAFE";
    alarm.ack = true;

    alarm.acknowledgedAt = new Date();
    alarm.acknowledgedBy = user || "system";

    alarm.ackUser = alarm.acknowledgedBy; // ✅ NEW

    alarm.armedAt = new Date(); // restart timer
    await alarm.save();

    return res.json({
      success: true,
      message: "Alarm acknowledged, system SAFE",
      data: {
        state: alarm.state,
        ack: alarm.ack,
        roomNo: alarm.roomNo,
        devId: alarm.devId,
      },
    });
  } catch (err) {
    console.error("Acknowledge error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
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
