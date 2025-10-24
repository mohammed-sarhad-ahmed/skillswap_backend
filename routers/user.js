import express, { Router } from "express";
import {
  addLearningSkill,
  addTeachingSkill,
  deleteLearningSkill,
  getUserProfile,
  deleteTeachingSkill,
  updateProfile,
  updateProfileAndPicture,
  getCredit,
  increaseCredit,
  decreaseTheCredit,
  deleteMe,
  getPublicUsers,
  addCredit,
  getTeacher,
} from "../handlers/user.js";
import { protectRoute } from "../handlers/auth.js";
import { uploadSingle, resizeImage } from "../handlers/upload.js";

const router = express.Router();

router.use(protectRoute);

router.get("/", getPublicUsers);

router.get("/teacher/:id", getTeacher);

router.post("/me", getUserProfile);

router.patch("/me", updateProfile);

router.delete("/deleteMe", deleteMe);

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

router.get("/credits", getCredit);

router.post("/credits/increase", increaseCredit);
router.post("/credits/add-credit", addCredit);

router.post("/credits/decrease", decreaseTheCredit);

export default router;
