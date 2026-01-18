import FireAlarm from "../models/FireAlarm.js";

const COOLDOWN_MINUTES = 1;

// POST /firealm


const ARM_DELAY_MINUTES = 1;


export const handleFireAlarm = async (req, res) => {
  try {
    const { devid, button, smoke, fire, time, roomNo } = req.body;

    // ✅ BASIC validation (device ko kabhi 400 na mile except truly invalid)
    if (!devid || !time) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload. Required: devid and time",
      });
    }

    // ✅ Normalize time (supports "YYYY-MM-DD HH:mm:ss")
    const eventTime = new Date(String(time).replace(" ", "T"));
    if (Number.isNaN(eventTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid time format",
      });
    }

    // ✅ Normalize booleans
    const buttonBool = button === true;
    const smokeBool = smoke === true;
    const fireBool = fire === true;

    // 🔥 DANGER logic (button = fire = smoke)
    const danger = buttonBool || smokeBool || fireBool;

    // 🔍 Fetch last alarm for this device
    const lastAlarm = await FireAlarm.findOne({ devId: devid }).sort({
      createdAt: -1,
    });

    const now = Date.now();

    // ─────────────────────────────────────
    // 1️⃣ FIRST EVENT EVER
    // ─────────────────────────────────────
    if (!lastAlarm) {
      const first = await FireAlarm.create({
        devId: devid,
        roomNo: roomNo || "",
        button: buttonBool,
        smoke: smokeBool,
        fire: fireBool,
        state: danger ? "ALARM" : "SAFE",
        ack: !danger,
        ackUser: "",
        eventTime,
        armedAt: !danger ? new Date() : null,
      });

      return res.json({
        success: true,
        ack: first.ack,
        ackUser: "",
        dateTime: first.eventTime.toISOString(),
      });
    }

    // ─────────────────────────────────────
    // 2️⃣ ALARM ACTIVE → NEVER CREATE NEW
    // (exactly like old fire/smoke behavior)
    // ─────────────────────────────────────
    if (lastAlarm.state === "ALARM") {
      lastAlarm.button = buttonBool;
      lastAlarm.smoke = smokeBool;
      lastAlarm.fire = fireBool;
      lastAlarm.eventTime = eventTime;
      if (roomNo) lastAlarm.roomNo = roomNo;

      await lastAlarm.save();

      return res.json({
        success: true,
        ack: false, // buzzer ON
        ackUser: "",
        dateTime: eventTime.toISOString(),
      });
    }

    // ─────────────────────────────────────
    // 3️⃣ SAFE → ARMED after 1 minute (post-ACK)
    // ─────────────────────────────────────
    let systemState = lastAlarm.state;

    if (systemState === "SAFE") {
      const safeMinutes =
        (now - new Date(lastAlarm.armedAt || lastAlarm.updatedAt).getTime()) /
        60000;

      if (safeMinutes >= ARM_DELAY_MINUTES) {
        systemState = "ARMED";
        lastAlarm.state = "ARMED";
        await lastAlarm.save();
      }
    }

    // ─────────────────────────────────────
    // 4️⃣ ARMED + danger → NEW ALARM
    // ─────────────────────────────────────
    if (systemState === "ARMED" && danger) {
      const newAlarm = await FireAlarm.create({
        devId: devid,
        roomNo: roomNo || lastAlarm.roomNo || "",
        button: buttonBool,
        smoke: smokeBool,
        fire: fireBool,
        state: "ALARM",
        ack: false,
        ackUser: "",
        eventTime,
      });

      return res.json({
        success: true,
        ack: false,
        ackUser: "",
        dateTime: newAlarm.eventTime.toISOString(),
      });
    }

    // ─────────────────────────────────────
    // 5️⃣ NO DANGER → SAFE RESPONSE
    // (sensor smoke=false/fire=false case)
    // ─────────────────────────────────────
    lastAlarm.button = buttonBool;
    lastAlarm.smoke = smokeBool;
    lastAlarm.fire = fireBool;
    lastAlarm.eventTime = eventTime;
    if (roomNo) lastAlarm.roomNo = roomNo;

    await lastAlarm.save();

    return res.json({
      success: true,
      ack: true, // buzzer OFF
      ackUser: lastAlarm.ackUser || "",
      dateTime: eventTime.toISOString(),
    });
  } catch (err) {
    console.error("Fire alarm error:", err);
    return res.status(500).json({
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
