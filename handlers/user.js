import { UserModel } from "../models/user.js";
import response from "../utils/response.js";
import AppError from "../utils/app_error.js";

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

export const updateProfile = async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);
  if (!user) return next(new AppError("User not found", 404));

  const allowedFields = ["fullName", "email"];
  for (const field of allowedFields) {
    if (req.body[field]) user[field] = req.body[field];
  }

  await user.save();

  response(res, "Profile updated successfully", { user });
};

export const updateProfileAndPicture = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) return next(new AppError("User not found", 404));

    if (
      req.body.avatar &&
      user.avatar &&
      user.avatar !== "default-avatar.jpg"
    ) {
      const oldPath = path.join("public", "user_avatar", user.avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const updates = {};
    if (req.body.fullName) updates.fullName = req.body.fullName;
    if (req.body.email) updates.email = req.body.email;
    if (req.file) updates.avatar = req.file.filename;

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user.id,
      updates,
      {
        new: true,
      }
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
