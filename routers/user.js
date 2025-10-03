import express from "express";
import { getUserProfile } from "../handlers/user.js";
import { protectRoute } from "../handlers/auth.js";

const router = express.Router();

router.post("/me", protectRoute, getUserProfile);

export default router;
getUserProfile;
