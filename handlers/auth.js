import { UserModel } from "../models/user.js";
import response from "../utils/response.js";
import jwt from "jsonwebtoken";
import AppError from "../utils/app_error.js";
import generateVerificationCode from "../utils/email_verification";
import VerifyEmail from "../utils/email_verification";
import simpleHash from "../utils/simple_hashing.js";
import { promisify } from "util";

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
  let { token } = req.cookies;
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

//this is more readable than what eslint suggest
// eslint-disable-next-line arrow-body-style
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};
