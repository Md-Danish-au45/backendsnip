import express from "express";
import {
  handleFireAlarm,
  acknowledgeAlarm,
  getAllAlarms,
  getAlarmsByDevice,
  getAlarmById,
} from "../controllers/fireAlarmController.js";

const router = express.Router();

// DEVICE → SERVER
router.post("/firealm", handleFireAlarm);

// USER/ADMIN → ACKNOWLEDGE
router.patch("/:id/ack", acknowledgeAlarm);

// 📥 GET APIs
router.get("/", getAllAlarms);                 // /alarms
router.get("/device/:devId", getAlarmsByDevice); // /alarms/device/DEV001
router.get("/:id", getAlarmById);              // /alarms/65ab...

export default router;
