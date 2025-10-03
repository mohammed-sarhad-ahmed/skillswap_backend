import express from "express";
import {
  signUp,
  login,
  resendVerificationCode,
  verifyEmail,
  protectRoute,
  logout,
  forgotPassword,
  resetPassword,
} from "../handlers/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/sign-up", signUp);
router.post("/verify-email", protectRoute, verifyEmail);
router.post("/logout", protectRoute, logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/resend-verification-code", protectRoute, resendVerificationCode);

export default router;
