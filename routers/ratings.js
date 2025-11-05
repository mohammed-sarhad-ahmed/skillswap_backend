import express from "express";
import {
  submitRating,
  getTeacherRatings,
  getMyRatings,
  getTeacherRatingStats,
} from "../handlers/ratings.js";
import { protectRoute } from "../handlers/auth.js";

const router = express.Router();

// All routes are protected
router.use(protectRoute);

// Submit a rating and review
router.post("/submit", submitRating);

// Get ratings for a specific teacher
router.get("/teacher/:teacherId", getTeacherRatings);

// Get user's own ratings
router.get("/my-ratings", getMyRatings);

// Get rating statistics for a teacher
router.get("/teacher/:teacherId/stats", getTeacherRatingStats);

export default router;
