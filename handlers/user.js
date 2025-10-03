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
