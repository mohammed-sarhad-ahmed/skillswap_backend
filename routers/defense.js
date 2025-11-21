import express from "express";
import multer from "multer";
import path from "path";
import {
  submitDefense,
  getDefenseForReport,
  getDefenseForAdmin,
} from "../handlers/defense.js";
import { protectRoute } from "../handlers/auth.js";
import { protectAdmin } from "../handlers/admin.js";

const router = express.Router();

// Multer setup for defense image upload
// ===========================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/defenses"); // make sure this folder exists
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Only accept images
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({ storage, fileFilter });

// User routes
router.post(
  "/submit",
  protectRoute,
  upload.single("defenseImage"),
  submitDefense
);
router.get("/report/:reportId", protectRoute, getDefenseForReport);

// Admin routes
router.get("/admin/:reportId", protectAdmin, getDefenseForAdmin);

export default router;
