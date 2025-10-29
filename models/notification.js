// models/notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // recipient
  type: {
    type: String,
    enum: ["message", "connection_request"],
    required: true,
  },
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // sender
  content: { type: String }, // optional text
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Notification = mongoose.model("Notification", notificationSchema);
