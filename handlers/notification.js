// controllers/notificationController.js
import { Notification } from "../models/notification.js";
import AppError from "../utils/app_error.js";
import response from "../utils/response.js";

// Get all notifications for current user
export const getNotifications = async (req, res, next) => {
  if (!req.user) return next(new AppError("You are not logged in!", 401));

  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate("from", "fullName _id");
  response(res, "Notifications fetched successfully", { notifications });
};

// Get unread notifications count
export const getUnreadCount = async (req, res, next) => {
  if (!req.user) return next(new AppError("You are not logged in!", 401));

  const count = await Notification.countDocuments({
    user: req.user._id,
    read: false,
  });
  response(res, "Unread notifications count fetched successfully", { count });
};

// Mark a notification as read
export const markManyAsRead = async (req, res, next) => {
  if (!req.user) return next(new AppError("You are not logged in!", 401));
  const { ids } = req.body;

  await Notification.updateMany(
    { _id: { $in: ids }, user: req.user._id },
    { $set: { read: true } }
  );

  res.json({ message: "Selected notifications marked as read" });
};

// Delete a specific notification
export const deleteNotification = async (req, res, next) => {
  if (!req.user) return next(new AppError("You are not logged in!", 401));

  const notif = await Notification.findById(req.params.id);
  if (!notif) return next(new AppError("Notification not found", 404));

  // Make sure the logged-in user owns this notification
  if (notif.user.toString() !== req.user._id.toString()) {
    return next(
      new AppError("You are not allowed to delete this notification", 403)
    );
  }

  await notif.deleteOne();

  response(res, "Notification deleted successfully");
};

export const markSeenOrDelete = async (req, res, next) => {
  const notif = await Notification.findById(req.params.id);
  if (!notif) return next(new AppError("Notification not found", 404));

  if (notif.seen) {
    await notif.deleteOne();
    return response(res, "Notification deleted because already seen");
  }

  notif.seen = true;
  await notif.save();

  response(res, "Notification marked as seen");
};
