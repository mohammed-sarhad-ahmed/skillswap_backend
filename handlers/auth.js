import { UserModel } from "../models/user.js";
import response from "../utils/response.js";
import jwt from "jsonwebtoken";
import AppError from "../utils/app_error.js";
import generateVerificationCode from "../utils/generate_verification_code.js";
import VerifyEmail from "../utils/email_verification.js";
import simpleHash from "../utils/simple_hashing.js";
import { promisify } from "util";
import generateResetToken from "../utils/generate_reset_token.js";
import ResetEmail from "../utils/reset_password.js";

function signTokenAsync(payload, secret, options) {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, secret, options, (err, token) => {
      if (err) return reject(err);
      resolve(token);
    });
  });
}

async function sendEmailVerification(user) {
  const verificationCode = generateVerificationCode();
  user.verificationCode = simpleHash(verificationCode);
  const TEN_MINUTES = 10 * 60 * 1000;
  user.verificationCodeExp = new Date(Date.now() + TEN_MINUTES);
  await user.save({ validateModifiedOnly: true });

  const verificationEmail = new VerifyEmail(
    "email_verification",
    user.fullName,
    user.email,
    "Email Verification",
    verificationCode
  );

  console.log(verificationEmail);

  await verificationEmail.sendEmail();
}

export const signUp = async (req, res, next) => {
  const { fullName, email, password, passwordConfirm } = req.body;

  const newUser = await UserModel.create({
    fullName,
    email,
    password,
    passwordConfirm,
  });

  sendEmailVerification(newUser);

  const token = await signTokenAsync(
    { id: newUser._id },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXP,
    }
  );

  response(res, "User signed up successfully", { user: newUser, token }, 201);
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const user = await UserModel.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }
  const token = await signTokenAsync({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXP,
  });

  response(res, "User logged in successfully", { user, token }, 200);
};

export async function verifyEmail(req, res, next) {
  const { code } = req.body;
  if (!code) {
    return next(new AppError("Verification code is required", 400));
  }
  const hashedCode = simpleHash(code);
  const user = await UserModel.findOne({
    _id: req.user._id,
    verificationCode: hashedCode,
    verificationCodeExp: {
      $gte: new Date(),
    },
  });
  if (!user) {
    return next(new AppError("The verification code is wrong or expired", 401));
  }

  user.isEmailVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExp = undefined;
  await user.save({
    validateModifiedOnly: true,
  });

  response(res, "The email is verified.");
}

export async function resendVerificationCode(req, res, next) {
  const user = await UserModel.findById(req.user._id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  if (user.isEmailVerified) {
    return response(res, "user is already verified");
  }
  try {
    await sendEmailVerification(user);
    response(res, "Verification code was successfully sent.");
  } catch (e) {
    next(new AppError("Something went wrong during sending the email", 500));
  }
}

export const logout = async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  user.tokenVersion += 1;
  await user.save({ validateModifiedOnly: true });
  response(res, "User logged out successfully");
};

export async function protectRoute(req, res, next) {
  let { token } = req.body;
  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await UserModel.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        404
      )
    );
  }
  if (currentUser.tokenVersion > decoded.tokenVersion) {
    return next(
      new AppError(
        "The login token is no longer valid, Please login again.",
        401
      )
    );
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  req.user = currentUser;
  next();
}

export async function forgotPassword(req, res, next) {
  const { email } = req.body;
  const normalizedEmail = email?.toLowerCase()?.trim();
  const user = await UserModel.findOne({
    email: normalizedEmail,
  });
  if (!user) {
    const randomDelay = Math.floor(1823 + Math.random() * 1000);

    await new Promise((resolve) => {
      setTimeout(resolve, randomDelay);
    });

    return response(
      res,
      "If your email exists in our database, you have received a link to reset your password"
    );
  }

  const resetToken = generateResetToken();
  const hashedResetToken = simpleHash(resetToken);
  const TEN_MINUTES = 10 * 60 * 1000;
  user.passwordResetToken = hashedResetToken;
  user.passwordResetTokenExpires = new Date(Date.now() + TEN_MINUTES);
  await user.save({ validateModifiedOnly: true });

  const resetUrl = `${req.protocol}://localhost:5173/reset-password/${resetToken}`;
  try {
    const resetEmail = new ResetEmail(
      "reset_password",
      user.fullName,
      user.email,
      "Password Reset",
      resetUrl
    );
    await resetEmail.sendEmail();

    response(
      res,
      "If your email exists in our database, you have received a link to reset your password"
    );
  } catch (err) {
    user.passwordResetTokenExpires = undefined;
    user.passwordResetToken = undefined;
    await user.save({ validateModifiedOnly: true });
    console.error("Email send error:", err);
    return next(
      new AppError(
        "Something went wrong during sending the email. Please try again later!",
        500,
        "server_error"
      )
    );
  }
}

export async function resetPassword(req, res, next) {
  console.log(req.params.token);
  const user = await UserModel.findOne({
    passwordResetToken: simpleHash(req.params.token),
    passwordResetTokenExpires: { $gt: new Date() },
  });
  if (!user) {
    return next(
      new AppError(
        "Token is either invalid or expired.",
        400,
        "invalid_token_error"
      )
    );
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;
  await user.save();
  await res.status(200).json({
    status: "success",
  });
}
