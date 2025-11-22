import express from "express";
import {
  adminLogin,
  createAdminOnce,
  adminMe,
  protectAdmin,
  contactUs,
} from "../handlers/admin.js";
import { getAppointments } from "../handlers/appointments.js";
import { getAllRatings } from "../handlers/ratings.js";
import { getAllCourse } from "../handlers/course.js";
import { getAllUsers } from "../handlers/user.js";
import { getDefense } from "../handlers/defense.js";

const router = express.Router();

router.post("/admin-login", adminLogin);
router.post("/signup", createAdminOnce);
router.post("/me", protectAdmin, adminMe);
router.get("/appointment", protectAdmin, getAppointments);
router.get("/rating", protectAdmin, getAllRatings);
router.get("/courses", protectAdmin, getAllCourse);
router.get("/users", protectAdmin, getAllUsers);
router.get("/defense/:reportId", protectAdmin, getDefense);
router.post("/contact-us", contactUs);

export default router;
