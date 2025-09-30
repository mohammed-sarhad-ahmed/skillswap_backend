import { UserModel } from "../models/user.js";
import response from "../utils/response.js";
import jwt from "jsonwebtoken";
import AppError from "../utils/app_error.js";
import generateVerificationCode from "../utils/email_verification";
import VerifyEmail from "../utils/email_verification";
import simpleHash from "../utils/simple_hashing.js";

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
    user.name,
    user.email,
    "Email Verification",
    verificationCode
  );

  await verificationEmail.sendEmail();
}

export const signup = async (req, res, next) => {
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
