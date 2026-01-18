import FireAlarm from "../models/FireAlarm.js";

const COOLDOWN_MINUTES = 1;

// POST /firealm
const ARM_DELAY_MINUTES = 5;

// 🔥 DEVICE → SERVER
export const handleFireAlarm = async (req, res) => {
  try {
    const { devid, button, time } = req.body;

    if (!devid || typeof devid !== "string" || typeof button !== "boolean" || !time) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    const eventTime = new Date(time);
    if (isNaN(eventTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid time format",
      });
    }

    // 🔍 last alarm for this device (ack or not)
    const lastAlarm = await FireAlarm.findOne({ devId: devid })
      .sort({ createdAt: -1 });

    const now = Date.now();

    // 🟡 CASE 1: Active alarm already exists (ack=false)
    if (lastAlarm && lastAlarm.ack === false) {
      lastAlarm.button = button;
      lastAlarm.eventTime = eventTime;
      await lastAlarm.save();

      return res.json({
        success: true,
        ack: false,
        ackUser: "",
        dateTime: eventTime.toISOString(),
      });
    }

    // 🟠 CASE 2: Alarm was acknowledged → cooldown check
    if (lastAlarm && lastAlarm.ack === true && lastAlarm.ackAt) {
      const diffMinutes =
        (now - new Date(lastAlarm.ackAt).getTime()) / 60000;

      if (diffMinutes < COOLDOWN_MINUTES) {
        // ⛔ within 1 minute → do not create new alarm
        return res.json({
          success: true,
          ack: true,
          ackUser: lastAlarm.ackUser || "",
          dateTime: lastAlarm.ackAt.toISOString(),
        });
      }
    }

    // 🔥 CASE 3: Cooldown passed OR first alarm → create new alarm
    const alarm = await FireAlarm.create({
      devId: devid,
      button,
      eventTime,
      ack: false,
      ackUser: "",
      ackAt: null,
    });

    return res.json({
      success: true,
      ack: false,
      ackUser: "",
      dateTime: eventTime.toISOString(),
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
// PATCH /api/alarms/:id/ack
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

    if (alarm.ack === true) {
      // already acknowledged
      return res.json({
        success: true,
        ack: true,
        ackUser: alarm.ackUser || "",
        dateTime: (alarm.ackAt || alarm.updatedAt)?.toISOString?.() || "",
      });
    }

    alarm.ack = true;
    alarm.ackUser = (user && String(user)) || "system";
    alarm.ackAt = new Date();

    await alarm.save();

    return res.json({
      success: true,
      ack: true,
      ackUser: alarm.ackUser,
      dateTime: alarm.ackAt.toISOString(),
    });
  } catch (err) {
    console.error("Acknowledge error:", err);
    return res.status(500).json({
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
