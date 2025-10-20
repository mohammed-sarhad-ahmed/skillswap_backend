import { UserModel } from "../models/user.js";
import response from "../utils/response.js";
import AppError from "../utils/app_error.js";
import path from "path";
import fs from "fs";
import Appointment from "../models/appointments.js";

export const getUserProfile = async (req, res, next) => {
  const userId = req.user._id;

  const user = await UserModel.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  response(res, "User profile fetched successfully", { user });
};

export const addLearningSkill = async (req, res, next) => {
  const userId = req.user._id;
  const { skill } = req.body;

  if (!skill || skill.trim() === "") {
    return next(new AppError("Skill cannot be empty", 400));
  }

  const user = await UserModel.findById(userId);
  if (!user) return next(new AppError("User not found", 404));

  if (user.learningSkills.includes(skill)) {
    return next(new AppError("Skill already exists", 409));
  }

  user.learningSkills.push(skill);
  await user.save();

  response(res, "Learning skill added successfully", user);
};

export const addTeachingSkill = async (req, res, next) => {
  const userId = req.user._id;
  const { skill } = req.body;

  if (!skill || skill.trim() === "") {
    return next(new AppError("Skill cannot be empty", 400));
  }

  const user = await UserModel.findById(userId);
  if (!user) return next(new AppError("User not found", 404));

  if (user.teachingSkills.includes(skill)) {
    return next(new AppError("Skill already exists", 409));
  }

  user.teachingSkills.push(skill);
  await user.save();

  response(res, "Teaching skill added successfully", user);
};

export const deleteLearningSkill = async (req, res, next) => {
  const userId = req.user._id;
  const { skill } = req.body;

  if (!skill || skill.trim() === "") {
    return next(new AppError("Skill cannot be empty", 400));
  }

  const user = await UserModel.findById(userId);
  if (!user) return next(new AppError("User not found", 404));

  const index = user.learningSkills.indexOf(skill);
  if (index === -1) {
    return next(new AppError("Skill not found", 404));
  }

  user.learningSkills.splice(index, 1);
  await user.save();

  response(res, "Learning skill deleted successfully", user);
};

export const deleteTeachingSkill = async (req, res, next) => {
  const userId = req.user._id;
  const { skill } = req.body;

  if (!skill || skill.trim() === "") {
    return next(new AppError("Skill cannot be empty", 400));
  }

  const user = await UserModel.findById(userId);
  if (!user) return next(new AppError("User not found", 404));

  const index = user.teachingSkills.indexOf(skill);
  if (index === -1) {
    return next(new AppError("Skill not found", 404));
  }

  user.teachingSkills.splice(index, 1);
  await user.save();

  response(res, "Teaching skill deleted successfully", user);
};

// Helper function to validate availability
const validateAvailability = (availability) => {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  for (const day of days) {
    const dayData = availability[day];
    if (!dayData) {
      throw new AppError(`Availability for ${day} is missing`, 400);
    }

    // If the day is marked as off, skip start/end validation
    if (dayData.off) continue;

    if (!dayData.start || !dayData.end) {
      throw new AppError(`Availability for ${day} is incomplete`, 400);
    }

    const start = dayData.start;
    const end = dayData.end;

    // Check HH:MM format
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(start)) {
      throw new AppError(`Invalid start time for ${day}`, 400);
    }
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(end)) {
      throw new AppError(`Invalid end time for ${day}`, 400);
    }

    // Ensure start < end
    if (start >= end) {
      throw new AppError(`Start time must be before end time for ${day}`, 400);
    }
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user._id);
    if (!user) return next(new AppError("User not found", 404));

    const allowedFields = ["fullName", "email", "availability", "balance"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === "availability") {
          validateAvailability(req.body.availability);
        }
        user[field] = req.body[field];
      }
    }

    await user.save();

    response(res, "Profile updated successfully", { user });
  } catch (err) {
    next(err);
  }
};

export const updateProfileAndPicture = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) return next(new AppError("User not found", 404));

    if (req.file && user.avatar && user.avatar !== "default-avatar.jpg") {
      const oldPath = path.join("public", "user_avatar", user.avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const updates = {};
    if (req.body.fullName) updates.fullName = req.body.fullName;
    if (req.body.email) updates.email = req.body.email;
    if (req.body.balance !== undefined) updates.balance = req.body.balance;

    if (req.body.availability) {
      const availability = JSON.parse(req.body.availability);
      validateAvailability(availability);
      updates.availability = availability;
    }

    if (req.file) updates.avatar = req.file.filename;

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    );

    res.status(200).json({
      status: "success",
      data: { user: updatedUser },
    });
  } catch (err) {
    next(err);
  }
};

export async function increaseCredit(req, res, next) {
  try {
    const user = await UserModel.findByIdAndUpdate(
      req.user._id,
      { $inc: { credits: 1 } },
      { new: true }
    );

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    response(res, "The credit was successfully increased", { user });
  } catch (err) {
    next(err);
  }
}

export async function addCredit(req, res, next) {
  const { amount } = req.body;
  console.log(amount);
  if (!amount || amount <= 0) {
    return next(new AppError("Invalid amount or user", 400));
  }

  const user = await UserModel.findById(req.user._id);
  if (!user) return next(new AppError("User not found", 404));

  if (user.balance < amount) {
    return next(new AppError("Insufficient balance", 400));
  }

  user.balance -= amount;
  user.credits += amount; // 1$ = 1 credit
  await user.save();

  return response(res, "The credit was successfully increased", { user });
}

export async function decreaseTheCredit(req, res, next) {
  try {
    const user = await UserModel.findById(req.user._id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (user.credits <= 0) {
      return next(new AppError("Credits cannot go below 0", 400));
    }

    user.credits -= 1;
    await user.save();

    response(res, "The credit was successfully decreased", { user });
  } catch (err) {
    next(err);
  }
}

export async function getCredit(req, res, next) {
  try {
    const user = await UserModel.findById(req.user._id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    response(res, "User credits fetched successfully", {
      credits: user.credits,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteMe(req, res, next) {
  try {
    const userId = req.user._id;

    // Delete all appointments where the user is teacher or student
    await Appointment.deleteMany({
      $or: [{ teacher: userId }, { student: userId }],
    });

    // Delete the user
    await UserModel.findByIdAndDelete(userId);

    response(
      res,
      "Account and all associated appointments were deleted successfully"
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
}

export const getPublicUsers = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const users = await UserModel.find(
      currentUserId ? { _id: { $ne: currentUserId } } : {}
    );
    response(res, "Success", { users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};
