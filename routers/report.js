import express from "express";
import multer from "multer";
import path from "path";
import {
  createReport,
  getReports,
  getReport,
  acceptReport,
  rejectReport,
} from "../handlers/reports.js";
import { protectAdmin } from "../handlers/admin.js";
import { protectRoute } from "../handlers/auth.js";

const router = express.Router();

// ===========================
// Multer setup for proof upload
// ===========================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/reports"); // make sure this folder exists
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

// ===========================
// User creates report
// ===========================
router.post("/", protectRoute, upload.single("proof"), createReport);

// ===========================
// Admin-only routes
// ===========================
router.get("/admin", protectAdmin, getReports);
router.get("/admin/:id", protectAdmin, getReport);
router.patch("/admin/:id/accept", protectAdmin, acceptReport);
router.patch("/admin/:id/reject", protectAdmin, rejectReport);

export default router;
