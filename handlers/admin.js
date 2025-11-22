// controllers/adminController.js
import Admin from "../models/admin.js";
import AppError from "../utils/app_error.js";
import response from "../utils/response.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import ContactUsEmail from "../utils/contact_us.js";

// ===========================
// Helper: Sign JWT
// ===========================
const signToken = (id) => {
  return jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "90d",
  });
};

// ===========================
// Admin Login
// ===========================
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check fields
    if (!email || !password) {
      return next(new AppError("Email and password are required", 400));
    }

    // Find admin
    const admin = await Admin.findOne({ email }).select("+password");

    if (!admin) {
      return next(new AppError("Incorrect email or password", 401));
    }

    const bcrypt = (await import("bcrypt")).default;
    const correct = await bcrypt.compare(password, admin.password);

    if (!correct) {
      return next(new AppError("Incorrect email or password", 401));
    }

    // Create token
    const token = signToken(admin._id);

    response(
      res,
      "Admin logged in successfully",
      { token, admin: { id: admin._id, email: admin.email } },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// ===========================
// Protect Admin Middleware
// ===========================
export const protectAdmin = async (req, res, next) => {
  try {
    let token;

    console.log(req.headers);

    // Extract Bearer token
    if (req.headers.adminauth) {
      token = req.headers.adminauth;
    }

    if (!token) {
      return next(new AppError("You are not logged in as admin.", 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find admin
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return next(new AppError("Admin no longer exists.", 401));
    }

    req.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
};

export const createAdminOnce = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return next(new AppError("Email and password are required", 400));

    // Prevent duplicates
    const exists = await Admin.findOne({ email });
    if (exists)
      return next(new AppError("Admin with this email already exists", 400));

    const admin = await Admin.create({
      email,
      password: password,
      role: "admin",
    });

    response(res, "Admin created successfully", {
      id: admin._id,
      email: admin.email,
    });
  } catch (err) {
    next(err);
  }
};

// ===========================
// Get Admin Me
// ===========================
export const adminMe = async (req, res, next) => {
  try {
    // req.admin comes from protectAdmin middleware
    const admin = req.admin;

    response(
      res,
      "Admin authenticated successfully",
      {
        admin: {
          id: admin._id,
          email: admin.email,
          role: "admin",
        },
      },
      200,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

export const contactUs = async (req, res, next) => {
  try {
    const { name, email, message } = req.body;

    // Validate fields
    if (!name || !email || !message) {
      return next(new AppError("Please fill all fields", 400));
    }

    // Send admin notification email
    const mail = new ContactUsEmail(
      "contact",
      name,
      email,
      "New Contact Form Submission",
      message
    );

    await mail.sendEmail();

    // Unified success response
    return response(
      res,
      "Contact form submitted successfully",
      { name, email },
      200,
      "Success"
    );
  } catch (err) {
    console.error("Contact Us Email Error:", err);

    // Pass error to global handler
    return next(
      new AppError("Failed to deliver message — the squad is on it 💻⚙️", 500)
    );
  }
};
