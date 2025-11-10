import express from "express";
import {
  proposeCourse,
  getCourseProposals,
  acceptCourseProposal,
  rejectCourseProposal,
  getMyCourses,
  getCourseDetails,
  updateCourseWeek,
  addCourseMaterial,
  completeCourseWeek,
  cancelCourse,
  getCourseStats,
} from "../handlers/course.js";
import { protectRoute } from "../handlers/auth.js";

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
router.patch("/:courseId/weeks/:weekNumber", updateCourseWeek);
router.post("/:courseId/weeks/:weekNumber/materials", addCourseMaterial);
router.patch("/:courseId/weeks/:weekNumber/complete", completeCourseWeek);
router.patch("/:courseId/cancel", cancelCourse);

// Analytics
router.get("/:courseId/stats", getCourseStats);

export default router;
