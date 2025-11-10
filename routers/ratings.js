import express from "express";
import {
  submitRating,
  getTeacherRatings,
  getMyRatings,
  getTeacherRatingStats,
  getReceivedRatings,
  updateRating,
  addReplyToRating,
  deleteRating,
  deleteReply,
  updateReply,
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

// Get ratings received by the current user (as a teacher)
router.get("/received", getReceivedRatings);

// Update a rating/review (edit)
router.put("/:ratingId", updateRating);

// Delete a rating
router.delete("/:ratingId", deleteRating);

// Reply management routes - CORRECTED
router.put("/:ratingId/reply", addReplyToRating); // Add a new reply
router.patch("/:ratingId/reply", updateReply); // Update existing reply (using PATCH)
router.delete("/:ratingId/reply", deleteReply); // Delete reply

export default router;
