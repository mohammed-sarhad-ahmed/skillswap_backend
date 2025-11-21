import express from "express";
import {
  adminLogin,
  createAdminOnce,
  adminMe,
  protectAdmin,
} from "../handlers/admin.js";
import { getAppointments } from "../handlers/appointments.js";
import { getAllRatings } from "../handlers/ratings.js";
import { getAllCourse } from "../handlers/course.js";
import { getAllUsers } from "../handlers/user.js";

const router = express.Router();

router.post("/admin-login", adminLogin);
router.post("/signup", createAdminOnce);
router.post("/me", protectAdmin, adminMe);
router.get("/appointment", protectAdmin, getAppointments);
router.get("/rating", protectAdmin, getAllRatings);
router.get("/courses", protectAdmin, getAllCourse);
router.get("/users", protectAdmin, getAllUsers);

export default router;
