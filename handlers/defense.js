import { DefenseModel } from "../models/defense.js";
import Report from "../models/report.js";
import AppError from "../utils/app_error.js";
import response from "../utils/response.js";

export const submitDefense = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(
        new AppError("You must be logged in to submit a defense.", 401)
      );
    }

    const { reportId, defenseText } = req.body;
    const defenseImage = req.file ? `/defenses/${req.file.filename}` : null;

    if (!reportId || !defenseText) {
      return next(
        new AppError("Report ID and defense text are required.", 400)
      );
    }

    if (defenseText.length > 500) {
      return next(
        new AppError("Defense text cannot exceed 500 characters.", 400)
      );
    }

    // Check if report exists
    const report = await Report.findById(reportId);
    if (!report) {
      return next(new AppError("Report not found.", 404));
    }

    // Check if user is the reported user
    if (report.reportedUser.toString() !== req.user._id.toString()) {
      return next(
        new AppError("Not authorized to submit defense for this report.", 403)
      );
    }

    // Check if report is still pending
    if (report.status !== "pending") {
      return next(
        new AppError("Cannot submit defense for a resolved report.", 400)
      );
    }

    // Check if defense already exists
    const existingDefense = await DefenseModel.findOne({ reportId });
    if (existingDefense) {
      return next(
        new AppError("Defense already submitted for this report.", 400)
      );
    }

    // Create defense
    const defense = await DefenseModel.create({
      reportId,
      reportedUserId: req.user._id,
      defenseText,
      defenseImage,
    });

    // Update report to indicate defense was submitted
    report.defenseSubmitted = true;
    await report.save();

    response(res, "Defense submitted successfully", defense, 201, "Success");
  } catch (err) {
    next(err);
  }
};

// ===========================
// Get Defense for Report (User/Admin)
// ===========================
export const getDefenseForReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const defense = await DefenseModel.findOne({ reportId })
      .populate("reportedUserId", "fullName email")
      .populate("reportId", "title reason status reportedBy reportedUser");

    if (!defense) {
      return next(new AppError("Defense not found for this report.", 404));
    }

    // Authorization check
    const report = await Report.findById(reportId);

    // Allow access for:
    // 1. Admins
    // 2. User who submitted the defense
    // 3. User who created the report
    if (
      !req.admin &&
      defense.reportedUserId._id.toString() !== req.user?._id?.toString() &&
      report.reportedBy.toString() !== req.user?._id?.toString()
    ) {
      return next(new AppError("Not authorized to view this defense.", 403));
    }

    response(res, "Defense fetched successfully", defense);
  } catch (err) {
    next(err);
  }
};

// ===========================
// Get Defense for Admin (Admin only)
// ===========================
export const getDefenseForAdmin = async (req, res, next) => {
  try {
    if (!req.admin) {
      return next(new AppError("You must be an admin.", 403));
    }

    const { reportId } = req.params;

    const defense = await DefenseModel.findOne({ reportId })
      .populate("reportedUserId", "fullName email avatar")
      .populate({
        path: "reportId",
        populate: [
          { path: "reportedBy", select: "fullName email" },
          { path: "reportedUser", select: "fullName email" },
        ],
      });

    if (!defense) {
      return next(new AppError("Defense not found for this report.", 404));
    }

    response(res, "Defense fetched successfully", defense);
  } catch (err) {
    next(err);
  }
};
