// models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true }, // unique per two users
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true },
    read: { type: Boolean, default: false }, // ✅ optional read status
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
