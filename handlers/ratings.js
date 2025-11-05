import Rating from "../models/ratings.js";
import Appointment from "../models/appointments.js";
import { UserModel } from "../models/user.js";
import AppError from "../utils/app_error.js";
import response from "../utils/response.js";
import mongoose from "mongoose";

// Submit a rating and review
// Submit a rating and review
export const submitRating = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(
        new AppError("You are not logged in! Please log in to get access.", 401)
      );
    }

    const { teacherId, sessionId, rating, review } = req.body;
    const studentId = req.user._id;

    console.log("Rating submission:", {
      teacherId,
      sessionId,
      rating,
      studentId,
    });

    // Validate required fields
    if (!teacherId || !sessionId || !rating) {
      return next(
        new AppError("Teacher ID, session ID, and rating are required", 400)
      );
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return next(new AppError("Rating must be between 1 and 5", 400));
    }

    // Validate ObjectId format
    if (
      !mongoose.Types.ObjectId.isValid(teacherId) ||
      !mongoose.Types.ObjectId.isValid(sessionId)
    ) {
      return next(new AppError("Invalid ID format", 400));
    }

    // Check if session exists and user was a participant
    const session = await Appointment.findOne({
      _id: sessionId,
      teacher: teacherId,
      student: studentId,
    });

    if (!session) {
      return next(
        new AppError("Session not found or you are not a participant", 404)
      );
    }

    // Check if session has ended
    if (session.status !== "completed") {
      return next(new AppError("Can only rate completed sessions", 400));
    }

    // Check if student has already rated this session
    const existingRating = await Rating.findOne({
      session: sessionId,
      student: studentId,
    });

    if (existingRating) {
      return next(new AppError("You have already rated this session", 400));
    }

    // Verify the teacher exists (remove role check since anyone can be teacher)
    const teacher = await UserModel.findById(teacherId);
    if (!teacher) {
      return next(new AppError("User not found", 404));
    }

    // Create new rating
    const newRating = new Rating({
      teacher: teacherId,
      student: studentId,
      session: sessionId,
      rating,
      review: review || "No review provided.",
    });

    await newRating.save();

    // Update teacher's average rating
    await updateTeacherAverageRating(teacherId);

    // Populate the response with user data
    await newRating.populate("teacher", "fullName avatar");
    await newRating.populate("student", "fullName avatar");

    response(
      res,
      "Rating submitted successfully",
      { rating: newRating },
      201,
      "Success"
    );
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError("You have already rated this session", 400));
    }
    next(err);
  }
};
// Get ratings for a teacher
export const getTeacherRatings = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return next(new AppError("Invalid teacher ID format", 400));
    }

    // Verify teacher exists
    const teacher = await UserModel.findById(teacherId);
    if (!teacher) {
      return next(new AppError("Teacher not found", 404));
    }

    // Get ratings with student population
    const ratings = await Rating.find({ teacher: teacherId })
      .populate("student", "fullName avatar")
      .populate("session", "date time")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalRatings = await Rating.countDocuments({ teacher: teacherId });

    // Get average rating
    const averageResult = await Rating.aggregate([
      { $match: { teacher: new mongoose.Types.ObjectId(teacherId) } },
      { $group: { _id: null, average: { $avg: "$rating" } } },
    ]);

    const averageRating =
      averageResult.length > 0 ? averageResult[0].average : 0;

    response(
      res,
      "Teacher ratings fetched successfully",
      {
        ratings,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings,
        totalPages: Math.ceil(totalRatings / limit),
        currentPage: page,
      },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Get user's own ratings
export const getMyRatings = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(
        new AppError("You are not logged in! Please log in to get access.", 401)
      );
    }

    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const ratings = await Rating.find({ student: userId })
      .populate("teacher", "fullName avatar averageRating ratingCount")
      .populate("session", "date time")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalRatings = await Rating.countDocuments({ student: userId });

    response(
      res,
      "Your ratings fetched successfully",
      {
        ratings,
        totalRatings,
        totalPages: Math.ceil(totalRatings / limit),
        currentPage: page,
      },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Get rating statistics for a teacher
export const getTeacherRatingStats = async (req, res, next) => {
  try {
    const { teacherId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return next(new AppError("Invalid teacher ID format", 400));
    }

    // Verify teacher exists
    const teacher = await UserModel.findById(teacherId);
    if (!teacher) {
      return next(new AppError("Teacher not found", 404));
    }

    // Get rating statistics
    const stats = await Rating.aggregate([
      { $match: { teacher: new mongoose.Types.ObjectId(teacherId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ]);

    // Calculate rating distribution
    let ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (stats.length > 0 && stats[0].ratingDistribution) {
      stats[0].ratingDistribution.forEach((rating) => {
        ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
      });
    }

    const result = {
      averageRating:
        stats.length > 0 ? Math.round(stats[0].averageRating * 10) / 10 : 0,
      totalRatings: stats.length > 0 ? stats[0].totalRatings : 0,
      ratingDistribution,
    };

    response(
      res,
      "Teacher rating statistics fetched successfully",
      result,
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Helper function to update teacher's average rating
const updateTeacherAverageRating = async (teacherId) => {
  try {
    const result = await Rating.aggregate([
      { $match: { teacher: new mongoose.Types.ObjectId(teacherId) } },
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    const averageRating = result.length > 0 ? result[0].average : 0;
    const ratingCount = result.length > 0 ? result[0].count : 0;

    await UserModel.findByIdAndUpdate(teacherId, {
      averageRating: Math.round(averageRating * 10) / 10,
      ratingCount,
    });
  } catch (error) {
    console.error("Error updating teacher average rating:", error);
  }
};
