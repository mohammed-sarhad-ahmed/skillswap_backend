// routes/notifications.js
import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markManyAsRead,
} from "../handlers/notification.js";

import { protectRoute } from "../handlers/auth.js";

const router = express.Router();

router.use(protectRoute);

// Get all notifications
router.get("/", getNotifications);

// Get unread count
router.get("/unread-count", getUnreadCount);

// Mark as read
router.post("/mark-many-read", markManyAsRead);

export default router;
