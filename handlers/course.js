import Course from "../models/course.js";
import { UserModel } from "../models/user.js";

import AppError from "../utils/app_error.js";
import response from "../utils/response.js";

// Propose a new course
export const proposeCourse = async (req, res, next) => {
  try {
    const {
      userBId,
      title,
      description,
      duration,
      userBTeachingSkill,
      userATeachingSkill,
      justWantToLearn = false,
    } = req.body;

    const userAId = req.user._id;

    // Validate required fields
    if (!userBId || !title || !duration || !userBTeachingSkill) {
      return next(
        new AppError(
          "User B ID, title, duration, and teaching skill are required",
          400
        )
      );
    }

    // Check if user exists and is different from current user
    if (userBId === userAId.toString()) {
      return next(new AppError("Cannot propose a course to yourself", 400));
    }

    // Check for existing pending/active course with same user
    const existingCourse = await Course.findOne({
      $or: [
        { userA: userAId, userB: userBId },
        { userA: userBId, userB: userAId },
      ],
      status: { $in: ["pending", "active"] },
    });

    if (existingCourse) {
      return next(
        new AppError(
          "You already have a pending or active course with this user",
          400
        )
      );
    }

    // Validate mutual exchange requirements
    if (!justWantToLearn && !userATeachingSkill) {
      return next(
        new AppError(
          "For mutual exchange, please select what you will teach, or check 'I just want to learn'",
          400
        )
      );
    }

    // Create new course proposal - weekly structures will be auto-created by pre-save hook
    const course = new Course({
      title,
      description,
      userA: userAId,
      userB: userBId,
      duration,
      exchangeType: justWantToLearn ? "one-way" : "mutual",
      userATeaching: {
        skill: justWantToLearn ? "" : userATeachingSkill,
        level: "",
      },
      userBTeaching: {
        skill: userBTeachingSkill,
        level: "",
      },
      justWantToLearn,
      proposedBy: userAId,
      status: "pending",
      // Weekly structures will be automatically created by the pre-save hook
    });

    await course.save();

    // Populate user data for response
    await course.populate("userA", "fullName avatar");
    await course.populate("userB", "fullName avatar");

    response(
      res,
      "Course proposal sent successfully",
      { course },
      201,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Get course proposals for a user
export const getCourseProposals = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const courses = await Course.find({
      userB: userId,
      status: "pending",
    })
      .populate("userA", "fullName avatar teachingSkills learningSkills")
      .populate("proposedBy", "fullName avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Course.countDocuments({
      userB: userId,
      status: "pending",
    });

    response(
      res,
      "Course proposals fetched successfully",
      {
        courses,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Accept a course proposal
export const acceptCourseProposal = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const course = await Course.findById(courseId);

    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    // Check if user is userB of this course
    if (course.userB.toString() !== userId.toString()) {
      return next(new AppError("Not authorized to accept this course", 403));
    }

    if (course.status !== "pending") {
      return next(new AppError("Course proposal is not pending", 400));
    }

    // Ensure weekly structures exist (they should already from the proposal)
    if (
      course.userAWeeklyStructure.length === 0 ||
      course.userBWeeklyStructure.length === 0
    ) {
      course.initializeWeeklyStructures();
    }

    // Activate course
    course.status = "active";
    course.acceptedAt = new Date();
    course.startDate = new Date();

    await course.save();

    await course.populate("userA", "fullName avatar");
    await course.populate("userB", "fullName avatar");

    response(
      res,
      "Course proposal accepted successfully",
      { course },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Reject a course proposal
export const rejectCourseProposal = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const course = await Course.findById(courseId);

    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    if (course.userB.toString() !== userId.toString()) {
      return next(new AppError("Not authorized to reject this course", 403));
    }

    if (course.status !== "pending") {
      return next(new AppError("Course proposal is not pending", 400));
    }

    course.status = "rejected";
    await course.save();

    response(
      res,
      "Course proposal rejected successfully",
      { course },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Get user's courses
export const getMyCourses = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status, role } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    // Filter by role (userA, userB, or both)
    if (role === "userA") {
      query.userA = userId;
    } else if (role === "userB") {
      query.userB = userId;
    } else {
      query.$or = [{ userA: userId }, { userB: userId }];
    }

    // Filter by status
    if (status && status !== "all") {
      query.status = status;
    }

    const courses = await Course.find(query)
      .populate("userA", "fullName avatar")
      .populate("userB", "fullName avatar")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Course.countDocuments(query);

    response(
      res,
      "Courses fetched successfully",
      {
        courses,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Get detailed course information
export const getCourseDetails = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const course = await Course.findById(courseId)
      .populate("userA", "fullName avatar email availability")
      .populate("userB", "fullName avatar email availability")
      .populate("proposedBy", "fullName avatar");

    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    // Check if user is participant in this course
    if (
      course.userA._id.toString() !== userId.toString() &&
      course.userB._id.toString() !== userId.toString()
    ) {
      return next(new AppError("Not authorized to view this course", 403));
    }

    response(
      res,
      "Course details fetched successfully",
      { course },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Update course week (title, description, etc.)
export const updateCourseWeek = async (req, res, next) => {
  try {
    const { courseId, weekNumber, structureType } = req.params;
    const userId = req.user._id;
    const updates = req.body;

    const course = await Course.findById(courseId);

    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    // Check if user is authorized to update this structure
    let weeklyStructure;
    if (
      structureType === "userA" &&
      course.userA.toString() === userId.toString()
    ) {
      weeklyStructure = course.userAWeeklyStructure;
    } else if (
      structureType === "userB" &&
      course.userB.toString() === userId.toString()
    ) {
      weeklyStructure = course.userBWeeklyStructure;
    } else {
      return next(
        new AppError("Not authorized to update this course content", 403)
      );
    }

    const weekIndex = parseInt(weekNumber) - 1;

    if (weekIndex < 0 || weekIndex >= weeklyStructure.length) {
      return next(new AppError("Invalid week number", 400));
    }

    // Update week details
    if (updates.title) weeklyStructure[weekIndex].title = updates.title;
    if (updates.description)
      weeklyStructure[weekIndex].description = updates.description;

    await course.save();

    response(
      res,
      "Course week updated successfully",
      { week: weeklyStructure[weekIndex] },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Upload file to course week (REPLACES addCourseMaterial)
export const uploadCourseFile = async (req, res, next) => {
  try {
    const { courseId, weekNumber, structureType } = req.params;
    const userId = req.user._id;
    const { title, description } = req.body;

    if (!req.file) {
      return next(new AppError("File is required", 400));
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    // FIXED: More flexible authorization logic
    let weeklyStructure;
    let isAuthorized = false;

    if (
      structureType === "userA" &&
      course.userA.toString() === userId.toString()
    ) {
      weeklyStructure = course.userAWeeklyStructure;
      isAuthorized = true;
    } else if (
      structureType === "userB" &&
      course.userB.toString() === userId.toString()
    ) {
      weeklyStructure = course.userBWeeklyStructure;
      isAuthorized = true;
    }

    // Additional check for one-way learning where teacher can upload to student's structure
    if (!isAuthorized && course.justWantToLearn) {
      const teacherId =
        course.proposedBy.toString() === course.userA.toString()
          ? course.userB.toString()
          : course.userA.toString();

      if (userId.toString() === teacherId) {
        weeklyStructure =
          structureType === "userA"
            ? course.userAWeeklyStructure
            : course.userBWeeklyStructure;
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return next(new AppError("Not authorized to upload to this course", 403));
    }

    const weekIndex = parseInt(weekNumber) - 1;
    if (weekIndex < 0 || weekIndex >= weeklyStructure.length) {
      return next(new AppError("Invalid week number", 400));
    }

    // Create content object matching frontend structure
    const newContent = {
      id: `content_${Date.now()}`,
      type: "document",
      title: title || req.file.originalname,
      fileType: req.file.mimetype.split("/")[1] || "file",
      uploadDate: new Date().toISOString().split("T")[0],
      uploadedBy: userId,
      size:
        req.file.size < 1024 * 1024
          ? `${(req.file.size / 1024).toFixed(1)} KB`
          : `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`,
      fileUrl: `/${req.file.filename}`,
      description: description || "",
    };

    // Add to content array
    weeklyStructure[weekIndex].content.push(newContent);
    await course.save();

    response(
      res,
      "File uploaded successfully",
      { content: weeklyStructure[weekIndex].content },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Add appointment to course week
export const addCourseAppointment = async (req, res, next) => {
  try {
    const { courseId, weekNumber } = req.params;
    const userId = req.user._id;
    const {
      title,
      description,
      date,
      time,
      duration,
      appointmentId,
      teacher,
      student,
    } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    // Check if user is participant
    if (
      course.userA.toString() !== userId.toString() &&
      course.userB.toString() !== userId.toString()
    ) {
      return next(
        new AppError("Not authorized to add appointments to this course", 403)
      );
    }

    const weekIndex = parseInt(weekNumber) - 1;
    if (weekIndex < 0 || weekIndex >= course.userAWeeklyStructure.length) {
      return next(new AppError("Invalid week number", 400));
    }

    // Create appointment content
    const appointmentContent = {
      id: `appointment_${Date.now()}`,
      type: "appointment",
      title: title || "Course Meeting",
      date: date,
      time: time,
      duration: duration || 60,
      description: description || "",
      appointmentId: appointmentId,
      teacher: teacher,
      student: student,
      participants: [course.userA, course.userB],
      status: "scheduled",
      createdAt: new Date(),
    };

    // Add to both users' weekly structures
    if (course.userAWeeklyStructure[weekIndex]) {
      course.userAWeeklyStructure[weekIndex].content.push(appointmentContent);
    }
    if (course.userBWeeklyStructure[weekIndex]) {
      course.userBWeeklyStructure[weekIndex].content.push(appointmentContent);
    }

    await course.save();

    response(
      res,
      "Appointment added to course successfully",
      { appointment: appointmentContent },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Mark week as completed
export const completeCourseWeek = async (req, res, next) => {
  try {
    const { courseId, weekNumber, structureType } = req.params;
    const userId = req.user._id;

    const course = await Course.findById(courseId);

    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    // Check if user is authorized to mark this week as completed
    let weeklyStructure;
    if (
      structureType === "userA" &&
      course.userA.toString() === userId.toString()
    ) {
      weeklyStructure = course.userAWeeklyStructure;
    } else if (
      structureType === "userB" &&
      course.userB.toString() === userId.toString()
    ) {
      weeklyStructure = course.userBWeeklyStructure;
    } else {
      return next(new AppError("Not authorized", 403));
    }

    const weekIndex = parseInt(weekNumber) - 1;

    if (weekIndex < 0 || weekIndex >= weeklyStructure.length) {
      return next(new AppError("Invalid week number", 400));
    }

    weeklyStructure[weekIndex].completed = true;
    course.updateProgress(); // Recalculate overall progress

    // Check if all weeks are completed
    const allUserAWeeksCompleted = course.userAWeeklyStructure.every(
      (week) => week.completed
    );
    const allUserBWeeksCompleted = course.justWantToLearn
      ? true // For one-way learning, only userA's weeks need to be completed
      : course.userBWeeklyStructure.every((week) => week.completed);

    if (allUserAWeeksCompleted && allUserBWeeksCompleted) {
      course.status = "completed";
      course.completedAt = new Date();
    }

    await course.save();

    response(
      res,
      "Week marked as completed",
      {
        week: weeklyStructure[weekIndex],
        progress: course.progress,
        status: course.status,
      },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Cancel a course
export const cancelCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;
    const { reason } = req.body;

    const course = await Course.findById(courseId);

    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    // Check if user is participant
    if (
      course.userA.toString() !== userId.toString() &&
      course.userB.toString() !== userId.toString()
    ) {
      return next(new AppError("Not authorized to cancel this course", 403));
    }

    if (course.status !== "active" && course.status !== "pending") {
      return next(
        new AppError("Cannot cancel a completed or rejected course", 400)
      );
    }

    course.status = "cancelled";
    await course.save();

    response(res, "Course cancelled successfully", { course }, 200, "Success");
  } catch (err) {
    next(err);
  }
};

// Get course statistics
export const getCourseStats = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const course = await Course.findById(courseId);

    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    // Check if user is participant
    if (
      course.userA.toString() !== userId.toString() &&
      course.userB.toString() !== userId.toString()
    ) {
      return next(new AppError("Not authorized", 403));
    }

    const stats = {
      exchangeType: course.exchangeType,
      justWantToLearn: course.justWantToLearn,
      totalWeeks: course.duration,
      userACompletedWeeks: course.userAWeeklyStructure.filter(
        (week) => week.completed
      ).length,
      userBCompletedWeeks: course.justWantToLearn
        ? 0 // For one-way learning, userB doesn't have weeks to complete
        : course.userBWeeklyStructure.filter((week) => week.completed).length,
      userATotalContent: course.userAWeeklyStructure.reduce(
        (acc, week) => acc + week.content.length,
        0
      ),
      userBTotalContent: course.justWantToLearn
        ? 0 // For one-way learning, userB doesn't have content
        : course.userBWeeklyStructure.reduce(
            (acc, week) => acc + week.content.length,
            0
          ),
      progress: course.progress,
      startDate: course.startDate,
      estimatedEndDate: course.startDate
        ? new Date(
            course.startDate.getTime() +
              course.duration * 7 * 24 * 60 * 60 * 1000
          )
        : null,
    };

    response(
      res,
      "Course statistics fetched successfully",
      { stats },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Get user availability for scheduling
export const getUserAvailability = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Check if users are in a course together
    const sharedCourse = await Course.findOne({
      $or: [
        { userA: currentUserId, userB: userId },
        { userA: userId, userB: currentUserId },
      ],
      status: "active",
    });

    if (!sharedCourse) {
      return next(new AppError("No active course found with this user", 404));
    }

    const user = await UserModel.findById(userId).select(
      "availability fullName avatar"
    );

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    response(
      res,
      "User availability fetched successfully",
      { user },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Delete course content
export const deleteCourseContent = async (req, res, next) => {
  try {
    const { courseId, weekNumber, structureType, contentId } = req.params;
    const userId = req.user._id;

    const course = await Course.findById(courseId);
    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    // Check authorization
    let weeklyStructure;
    if (
      structureType === "userA" &&
      course.userA.toString() === userId.toString()
    ) {
      weeklyStructure = course.userAWeeklyStructure;
    } else if (
      structureType === "userB" &&
      course.userB.toString() === userId.toString()
    ) {
      weeklyStructure = course.userBWeeklyStructure;
    } else {
      return next(
        new AppError("Not authorized to delete content from this course", 403)
      );
    }

    const weekIndex = parseInt(weekNumber) - 1;
    if (weekIndex < 0 || weekIndex >= weeklyStructure.length) {
      return next(new AppError("Invalid week number", 400));
    }

    // Remove content
    weeklyStructure[weekIndex].content = weeklyStructure[
      weekIndex
    ].content.filter((item) => item.id !== contentId);

    await course.save();

    response(
      res,
      "Content deleted successfully",
      { content: weeklyStructure[weekIndex].content },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};
