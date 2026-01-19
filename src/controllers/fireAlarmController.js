import FireAlarm from "../models/FireAlarm.js";




// Button re-trigger cooldown (minutes)
const COOLDOWN_MINUTES = 1;

export const handleFireAlarm = async (req, res) => {
  try {
    const { devid, button, smoke, fire, time, roomNo } = req.body;

    // ✅ BASIC validation
    if (!devid || !time) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload. Required: devid and time",
      });
    }

    // ✅ Normalize time (supports "YYYY-MM-DD HH:mm:ss" and ISO)
    const eventTime = new Date(String(time).replace(" ", "T"));
    if (Number.isNaN(eventTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid time format",
      });
    }

    // ✅ danger = button OR smoke OR fire
    const danger = Boolean(button || smoke || fire);

    // If nothing triggered, device should still get response
    if (!danger) {
      return res.json({
        success: true,
        ack: true,
        ackUser: "",
        dateTime: eventTime.toISOString(),
      });
    }

    // ✅ fetch latest alarm for this device
    const last = await FireAlarm.findOne({ devId: devid }).sort({ createdAt: -1 });

    // ✅ COOLDOWN RULE (after ACK / SAFE)
    if (last?.ack === true && last?.acknowledgedAt) {
      const diffMin =
        (eventTime.getTime() - new Date(last.acknowledgedAt).getTime()) / 60000;

      if (diffMin >= 0 && diffMin < COOLDOWN_MINUTES) {
        return res.json({
          success: true,
          ack: true,
          message: "Cooldown active, alarm not re-created",
          ackUser: last.ackUser || "",
          dateTime: eventTime.toISOString(),
        });
      }
    }

    // ✅ If last alarm is still active (ack=false), don't create new (optional safety)
    if (last?.ack === false && last?.state === "ALARM") {
      return res.json({
        success: true,
        ack: false,
        ackUser: last.ackUser || "",
        message: "Alarm already active",
        dateTime: eventTime.toISOString(),
      });
    }

    // ✅ Create NEW unique alarm record (every ring unique)
    const created = await FireAlarm.create({
      devId: devid,
      roomNo: roomNo || "",
      button: Boolean(button),
      smoke: Boolean(smoke),
      fire: Boolean(fire),

      state: "ALARM",
      ack: false,
      ackUser: "",

      eventTime,
    });

    return res.json({
      success: true,
      ack: created.ack, // false
      ackUser: created.ackUser, // ""
      dateTime: created.eventTime.toISOString(),
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
    alarm.ackUser = alarm.acknowledgedBy;

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
