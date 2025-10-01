import express from "express";
import {
  signUp,
  login,
  resendVerificationCode,
  verifyEmail,
  protectRoute,
} from "../handlers/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/sign-up", signUp);
router.post("/verify-email", protectRoute, verifyEmail);
router.post("/resend-verification-code", protectRoute, resendVerificationCode);

export default router;
