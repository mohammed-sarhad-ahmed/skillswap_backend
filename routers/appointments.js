// routes/appointmentRoutes.js
import express from "express";
import {
  createAppointment,
  getAppointments,
  getAppointment,
  updateAppointmentStatus,
  deleteAppointment,
} from "../handlers/appointments.js";

import { protectRoute } from "../handlers/auth.js";

const router = express.Router();

router.use(protectRoute);
router.post("/", createAppointment);
router.get("/", getAppointments);
router.get("/:id", getAppointment);
router.patch("/:id/status", updateAppointmentStatus);
router.delete("/:id", deleteAppointment);

export default router;
