// routes/appointmentRoutes.js
import express from "express";
import {
  createAppointment,
  getAppointments,
  getAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  updateAppointmentSchedule,
} from "../handlers/appointments.js";

import { protectRoute } from "../handlers/auth.js";

const router = express.Router();

router.use(protectRoute);
router.post("/", createAppointment);
router.get("/", getAppointments);
router.get("/:id", getAppointment);
router.patch("/:id", updateAppointmentStatus);
router.patch("/change-schedule/:id", updateAppointmentSchedule);

router.delete("/:id", deleteAppointment);

export default router;
