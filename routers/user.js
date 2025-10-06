import express from "express";
import {
  addLearningSkill,
  addTeachingSkill,
  deleteLearningSkill,
  getUserProfile,
  deleteTeachingSkill,
  updateProfile,
  updateProfileAndPicture,
} from "../handlers/user.js";
import { protectRoute } from "../handlers/auth.js";
import { uploadSingle, resizeImage } from "../handlers/upload.js";

const router = express.Router();

router.use(protectRoute);

router.post("/me", getUserProfile);

router.patch("/me", updateProfile);

router.patch(
  "/updateProfileAndPicture",
  uploadSingle("avatar"),
  resizeImage("user_avatar", "avatar"),
  updateProfileAndPicture
);

router
  .route("/teaching-Skill")
  .post(addTeachingSkill)
  .delete(deleteTeachingSkill);
router
  .route("/learning-skill")
  .post(addLearningSkill)
  .delete(deleteLearningSkill);

export default router;
