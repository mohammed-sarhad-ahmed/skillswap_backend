import express from "express";
import {
  proposeCourse,
  getCourseProposals,
  acceptCourseProposal,
  rejectCourseProposal,
  getMyCourses,
  getCourseDetails,
  updateCourseWeek,
  uploadCourseFile,
  addCourseAppointment,
  completeCourseWeek,
  cancelCourse,
  getCourseStats,
  getUserAvailability,
  deleteCourseContent,
} from "../handlers/course.js";
import { protectRoute } from "../handlers/auth.js";

// In routers/course.js
import multer from "multer";

// Configure multer for file uploads - FIXED to use public directory
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/"); // Changed from "uploads/" to "public/"
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Keep original filename but ensure uniqueness
    cb(null, "course-files-" + uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const router = express.Router();

// All routes are protected
router.use(protectRoute);

// Course proposals
router.post("/propose", proposeCourse);
router.get("/proposals", getCourseProposals);
router.patch("/:courseId/accept", acceptCourseProposal);
router.patch("/:courseId/reject", rejectCourseProposal);

// Course management
router.get("/my-courses", getMyCourses);
router.get("/:courseId", getCourseDetails);
router.patch("/:courseId/cancel", cancelCourse);

// Weekly structure management
router.patch("/:courseId/weeks/:weekNumber/:structureType", updateCourseWeek);
router.patch(
  "/:courseId/weeks/:weekNumber/:structureType/complete",
  completeCourseWeek
);

// Content management
router.post(
  "/:courseId/weeks/:weekNumber/:structureType/upload",
  upload.single("file"),
  uploadCourseFile
);
router.post("/:courseId/weeks/:weekNumber/appointments", addCourseAppointment);
router.delete(
  "/:courseId/weeks/:weekNumber/:structureType/content/:contentId",
  deleteCourseContent
);

// User availability for scheduling
router.get("/user/:userId/availability", getUserAvailability);

// Analytics
router.get("/:courseId/stats", getCourseStats);

export default router;
