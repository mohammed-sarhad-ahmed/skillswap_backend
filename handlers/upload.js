import multer from "multer";
import sharp from "sharp";
import AppError from "../utils/app_error.js";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Only images are allowed to be uploaded.", 400), false);
  }
};

export const uploadSingle = (fieldName) =>
  multer({ storage, fileFilter: multerFilter }).single(fieldName);

export const resizeImage = (folder, prefix) => {
  return async (req, res, next) => {
    try {
      if (!req.file) {
        return next(new AppError("Image is missing", 404));
      }

      const outputDir = path.join(__dirname, "../public", folder);

      try {
        await fs.access(outputDir);
      } catch {
        await fs.mkdir(outputDir, { recursive: true });
      }

      req.file.filename = `${prefix}-${randomUUID()}-${Math.random()}-${Date.now()}.jpeg`;

      await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(path.join(outputDir, req.file.filename));

      next();
    } catch (err) {
      next(err);
    }
  };
};
