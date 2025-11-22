import Report from "../models/report.js";
import AppError from "../utils/app_error.js";
import response from "../utils/response.js";
import { UserModel } from "../models/user.js"; // assuming your User model

// ===========================
// Create Report (User)
// ===========================
export const createReport = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("You must be logged in to report.", 401));
    }

    const { reportedUser, title, reason } = req.body;
    const proof = `/reports/${req.file.filename}`;

    if (!reportedUser || !title || !reason) {
      return next(
        new AppError("Reported user, title, and reason are required.", 400)
      );
    }

    const report = await Report.create({
      reportedBy: req.user._id,
      reportedUser,
      title,
      reason,
      proof,
    });

    response(res, "Report submitted successfully", report, 201, "Success");
  } catch (err) {
    next(err);
  }
};

// ===========================
// Get All Reports (Admin)
// ===========================
export const getReports = async (req, res, next) => {
  try {
    if (!req.admin) {
      return next(new AppError("You must be an admin.", 403));
    }

    const reports = await Report.find()
      .populate("reportedBy", "fullName email")
      .populate("reportedUser", "fullName email banned")
      .sort({ createdAt: -1 });

    response(res, "Reports fetched successfully", reports);
  } catch (err) {
    next(err);
  }
};

// ===========================
// Get Single Report (Admin)
// ===========================
export const getReport = async (req, res, next) => {
  try {
    if (!req.admin) {
      return next(new AppError("You must be an admin.", 403));
    }

    const report = await Report.findById(req.params.id)
      .populate("reportedBy", "fullName email")
      .populate("reportedUser", "fullName email banned");

    if (!report) {
      return next(new AppError("Report not found.", 404));
    }

    response(res, "Report fetched successfully", report);
  } catch (err) {
    next(err);
  }
};

// ===========================
// Accept Report (Admin → Ban User)
// ===========================
export const acceptReport = async (req, res, next) => {
  try {
    if (!req.admin) {
      return next(new AppError("You must be an admin.", 403));
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return next(new AppError("Report not found.", 404));
    }

    // Update report status
    report.status = "accepted"; // you may need to add status field in schema
    await report.save();

    // Ban the reported user
    const user = await UserModel.findById(report.reportedUser);
    if (user) {
      user.banned = true;
      await user.save();
    }

    response(res, "Report accepted and user banned.", report);
  } catch (err) {
    next(err);
  }
};

// ===========================
// Reject Report (Admin)
// ===========================
export const rejectReport = async (req, res, next) => {
  try {
    if (!req.admin) {
      return next(new AppError("You must be an admin.", 403));
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return next(new AppError("Report not found.", 404));
    }

    report.status = "rejected"; // you may need to add status field in schema
    await report.save();

    response(res, "Report rejected successfully.", report);
  } catch (err) {
    next(err);
  }
};

// ===========================
// Get Reports for Current User (User's own reports)
// ===========================
export const getMyReports = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("You must be logged in.", 401));
    }

    const reports = await Report.find({ reportedUser: req.user._id })
      .populate("reportedBy", "fullName email")
      .populate("reportedUser", "fullName email banned")
      .sort({ createdAt: -1 });

    response(res, "Your reports fetched successfully", reports);
  } catch (err) {
    next(err);
  }
};
