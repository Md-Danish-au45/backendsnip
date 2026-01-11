import FireAlarm from "../models/FireAlarm.js";

const COOLDOWN_MINUTES = 5;

// POST /firealm
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
    const isAlarmTriggered = smoke || fire;

    // 1️⃣ Fetch latest alarm
    const lastAlarm = await FireAlarm.findOne({ devId: devid })
      .sort({ createdAt: -1 })
      .lean();

    let allowInsert = false;

    if (!lastAlarm) {
      allowInsert = true;
    } else {
      const ageMinutes =
        (Date.now() - new Date(lastAlarm.eventTime).getTime()) / 60000;

      allowInsert =
        lastAlarm.ack === true && ageMinutes >= COOLDOWN_MINUTES;
    }

    // 2️⃣ INSERT or UPDATE
    if (allowInsert && isAlarmTriggered) {
      // ✅ Insert new alarm
      const newAlarm = await FireAlarm.create({
        devId: devid,
        smoke,
        fire,
        ack: false,
        eventTime,
      });

      return res.json({
        success: true,
        ack: false,
        ackUser: "",
        dateTime: "",
        alarmId: newAlarm._id,
      });
    } else {
      // Cooldown active → NO new alarm
      if (lastAlarm) {
        await FireAlarm.updateOne(
          { _id: lastAlarm._id },
          { $set: { smoke, fire } }
        );
      }

      return res.json({
        success: true,
        message: "Cooldown active, alarm not re-created",
        ack: lastAlarm?.ack ?? false,
      });
    }
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
    const { message, user } = req.body;

    const alarm = await FireAlarm.findById(id);
    if (!alarm) {
      return res.status(404).json({
        success: false,
        message: "Alarm not found",
      });
    }

    if (alarm.ack) {
      return res.status(400).json({
        success: false,
        message: "Alarm already acknowledged",
      });
    }

    alarm.ack = true;
    alarm.acknowledgedAt = new Date();
    alarm.acknowledgementMessage = message || "";
    alarm.acknowledgedBy = user || "system";

    await alarm.save();

    res.json({
      success: true,
      message: "Alarm acknowledged successfully",
      data: {
        id: alarm._id,
        ack: alarm.ack,
        acknowledgedAt: alarm.acknowledgedAt,
        acknowledgementMessage: alarm.acknowledgementMessage,
        acknowledgedBy: alarm.acknowledgedBy,
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
