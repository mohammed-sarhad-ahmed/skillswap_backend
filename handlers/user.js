import { UserModel } from "../models/user.js";
import response from "../utils/response.js";
import AppError from "../utils/app_error.js";
import path from "path";
import fs from "fs";
import Appointment from "../models/appointments.js";
import SkillModel from "../models/skills.js";

// Get user profile
export const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await UserModel.findById(userId);

    if (!user) return next(new AppError("User not found", 404));

    await user.populate("learningSkills teachingSkills");

    response(res, "User profile fetched successfully", { user });
  } catch (err) {
    next(err);
  }
};

export const getTeacher = async (req, res, next) => {
  const user = await UserModel.findById(req.params.id);

  if (!user) return next(new AppError("User not found", 404));

  await user.populate("learningSkills teachingSkills");

  response(res, "User profile fetched successfully", { user });
};

// Add learning skill
export const addLearningSkill = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { skill } = req.body;

    if (!skill || !skill.name?.trim())
      return next(new AppError("Skill name cannot be empty", 400));

    const skillDoc = await SkillModel.create(skill);

    const user = await UserModel.findById(userId);
    if (!user) return next(new AppError("User not found", 404));

    user.learningSkills.push(skillDoc._id);
    await user.save();

    response(res, "Learning skill added successfully", {
      user,
      skill: skillDoc,
    });
  } catch (err) {
    next(err);
  }
};

// Add teaching skill
export const addTeachingSkill = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { skill } = req.body;

    if (!skill || !skill.name?.trim())
      return next(new AppError("Skill name cannot be empty", 400));

    const user = await UserModel.findById(userId);
    if (!user) return next(new AppError("User not found", 404));

    if (user.teachingSkills.some((s) => s.name === skill.name)) {
      return next(new AppError("Skill already exists", 409));
    }

    const skillDoc = await SkillModel.create(skill);

    user.teachingSkills.push(skillDoc._id);
    await user.save();

    response(res, "Teaching skill added successfully", {
      user,
      skill: skillDoc,
    });
  } catch (err) {
    next(err);
  }
};

// Delete learning skill
export const deleteLearningSkill = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { skillId } = req.body;

    if (!skillId) return next(new AppError("Skill ID required", 400));

    const user = await UserModel.findById(userId);
    if (!user) return next(new AppError("User not found", 404));

    const index = user.learningSkills.findIndex(
      (id) => id.toString() === skillId
    );
    if (index === -1) return next(new AppError("Skill not found", 404));

    user.learningSkills.splice(index, 1);
    await user.save();

    await SkillModel.findByIdAndDelete(skillId);

    response(res, "Learning skill deleted successfully", { user });
  } catch (err) {
    next(err);
  }
};

// Delete teaching skill
export const deleteTeachingSkill = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { skillId } = req.body;

    if (!skillId) return next(new AppError("Skill ID required", 400));

    const user = await UserModel.findById(userId);
    if (!user) return next(new AppError("User not found", 404));

    const index = user.teachingSkills.findIndex(
      (id) => id.toString() === skillId
    );
    if (index === -1) return next(new AppError("Skill not found", 404));

    user.teachingSkills.splice(index, 1);
    await user.save();

    await SkillModel.findByIdAndDelete(skillId);

    response(res, "Teaching skill deleted successfully", { user });
  } catch (err) {
    next(err);
  }
};

// Validate availability helper
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
    if (!dayData) throw new AppError(`Availability for ${day} is missing`, 400);

    if (dayData.off) continue;

    if (!dayData.start || !dayData.end)
      throw new AppError(`Availability for ${day} is incomplete`, 400);

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(dayData.start))
      throw new AppError(`Invalid start time for ${day}`, 400);
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(dayData.end))
      throw new AppError(`Invalid end time for ${day}`, 400);

    if (dayData.start >= dayData.end)
      throw new AppError(`Start time must be before end time for ${day}`, 400);
  }
};

// Update profile
export const updateProfile = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user._id);
    if (!user) return next(new AppError("User not found", 404));

    const allowedFields = ["fullName", "email", "availability", "balance"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === "availability")
          validateAvailability(req.body.availability);
        user[field] = req.body[field];
      }
    }

    await user.save();

    response(res, "Profile updated successfully", { user });
  } catch (err) {
    next(err);
  }
};

// Update profile & picture
export const updateProfileAndPicture = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user._id);
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
      req.user._id,
      updates,
      { new: true }
    );

    response(res, "Profile updated successfully", { user: updatedUser });
  } catch (err) {
    next(err);
  }
};

// Credit management
export async function increaseCredit(req, res, next) {
  try {
    const user = await UserModel.findByIdAndUpdate(
      req.user._id,
      { $inc: { credits: 1 } },
      { new: true }
    );

    if (!user) return next(new AppError("User not found", 404));

    response(res, "Credit increased successfully", { user });
  } catch (err) {
    next(err);
  }
}

export async function addCredit(req, res, next) {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0)
      return next(new AppError("Invalid amount", 400));

    const user = await UserModel.findById(req.user._id);
    if (!user) return next(new AppError("User not found", 404));

    if (user.balance < amount)
      return next(new AppError("Insufficient balance", 400));

    user.balance -= amount;
    user.credits += amount;
    await user.save();

    response(res, "Credit added successfully", { user });
  } catch (err) {
    next(err);
  }
}

export async function decreaseTheCredit(req, res, next) {
  try {
    const user = await UserModel.findById(req.user._id);
    if (!user) return next(new AppError("User not found", 404));

    if (user.credits <= 0)
      return next(new AppError("Credits cannot go below 0", 400));

    user.credits -= 1;
    await user.save();

    response(res, "Credit decreased successfully", { user });
  } catch (err) {
    next(err);
  }
}

export async function getCredit(req, res, next) {
  try {
    const user = await UserModel.findById(req.user._id);
    if (!user) return next(new AppError("User not found", 404));

    response(res, "User credits fetched successfully", {
      credits: user.credits,
    });
  } catch (err) {
    next(err);
  }
}

// Delete user
export async function deleteMe(req, res, next) {
  try {
    const userId = req.user._id;

    await Appointment.deleteMany({
      $or: [{ teacher: userId }, { student: userId }],
    });
    await UserModel.findByIdAndDelete(userId);

    response(res, "Account and all appointments deleted successfully");
  } catch (err) {
    next(err);
  }
}

// Get public users
export const getPublicUsers = async (req, res, next) => {
  try {
    const currentUserId = req.user?._id;
    let users = await UserModel.find(
      currentUserId ? { _id: { $ne: currentUserId } } : {}
    ).populate("learningSkills teachingSkills");
    response(res, "Success", { users });
  } catch (err) {
    next(err);
  }
};
