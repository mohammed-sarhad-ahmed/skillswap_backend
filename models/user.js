import mongoose from "mongoose";
import bcrypt from "bcrypt";

const availabilitySchema = new mongoose.Schema({
  Monday: {
    start: { type: String, default: "09:00" },
    end: { type: String, default: "17:00" },
    off: { type: Boolean, default: false },
  },
  Tuesday: {
    start: { type: String, default: "09:00" },
    end: { type: String, default: "17:00" },
    off: { type: Boolean, default: false },
  },
  Wednesday: {
    start: { type: String, default: "09:00" },
    end: { type: String, default: "17:00" },
    off: { type: Boolean, default: false },
  },
  Thursday: {
    start: { type: String, default: "09:00" },
    end: { type: String, default: "17:00" },
    off: { type: Boolean, default: false },
  },
  Friday: {
    start: { type: String, default: "09:00" },
    end: { type: String, default: "17:00" },
    off: { type: Boolean, default: false },
  },
  Saturday: {
    start: { type: String, default: "09:00" },
    end: { type: String, default: "17:00" },
    off: { type: Boolean, default: false },
  },
  Sunday: {
    start: { type: String, default: "09:00" },
    end: { type: String, default: "17:00" },
    off: { type: Boolean, default: false },
  },
});

availabilitySchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    delete ret._id;
    return ret;
  },
});

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    avatar: {
      type: String,
      default: "default-avatar.jpg",
    },
    password: {
      type: String,
      minlength: 8,
      select: false,
      required: [true, "Please provide a password."],
    },
    passwordConfirm: {
      type: String,
      minlength: 8,
      select: false,
      required: [true, "Please provide a password."],
      validate: {
        validator: function (passwordConfirm) {
          return passwordConfirm === this.password;
        },
        message: "Password and password confirm must match.",
      },
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, "Balance cannot be less than 0"],
    },
    availability: { type: availabilitySchema, default: () => ({}) },
    isEmailVerified: { type: Boolean, default: false },
    verificationCode: { type: String, select: false },
    verificationCodeExp: { type: Date, select: false },
    tokenVersion: { type: Number, default: 1, select: false },
    passwordChangedAt: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetTokenExpires: { type: Date, select: false },
    learningSkills: {
      type: [String],
    },
    teachingSkills: {
      type: [String],
    },
    credits: {
      type: Number,
      default: 3,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  this.passwordConfirm = undefined;
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return changedTimestamp > JWTTimestamp;
  }
  return false;
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.passwordConfirm;
    delete ret.__v;
    delete ret.tokenVersion;
    delete ret.verificationCode;
    delete ret.verificationCodeExp;
    delete ret.passwordChangedAt;
    delete ret.passwordResetToken;
    delete ret.passwordResetTokenExpires;
    return ret;
  },
});

export const UserModel = mongoose.model("User", userSchema);
