import Message from "../models/messages.js";
import AppError from "../utils/app_error.js";
import { UserModel } from "../models/user.js";
import response from "../utils/response.js";

// Fetch messages in a room
export const getMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ roomId })
      .sort({ createdAt: 1 })
      .populate("senderId", "fullName avatar")
      .populate("receiverId", "fullName avatar");

    response(res, "Messages fetched", { messages });
  } catch (err) {
    console.log(err);
    next(new AppError("Failed to fetch messages", 500));
  }
};

// Fetch all conversations for the current user
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const messages = await Message.aggregate([
      { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$roomId",
          lastMessage: { $first: "$$ROOT" },
        },
      },
    ]);

    const chats = await Promise.all(
      messages.map(async (m) => {
        const otherUserId =
          m.lastMessage.senderId.toString() === userId.toString()
            ? m.lastMessage.receiverId
            : m.lastMessage.senderId;

        const otherUser = await UserModel.findById(
          otherUserId,
          "fullName avatar"
        );

        const unreadCount = await Message.countDocuments({
          roomId: m._id,
          receiverId: userId,
          read: false,
        });

        return {
          roomId: m._id,
          lastMessage: m.lastMessage,
          otherUser,
          unreadCount,
        };
      })
    );

    response(res, "Conversations fetched", { chats });
  } catch (err) {
    console.log(err);
    next(new AppError("Failed to fetch conversations", 500));
  }
};

export const getChatUsers = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    // Find all users who have messages with current user
    const messages = await Message.find({
      $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
    }).sort({ createdAt: -1 });

    // Extract unique user IDs
    const otherUserIds = new Set();
    messages.forEach((msg) => {
      if (msg.senderId.toString() !== currentUserId.toString())
        otherUserIds.add(msg.senderId.toString());
      if (msg.receiverId.toString() !== currentUserId.toString())
        otherUserIds.add(msg.receiverId.toString());
    });

    // Fetch user info
    const users = await UserModel.find({
      _id: { $in: Array.from(otherUserIds) },
    });

    // Attach last message
    const usersWithLastMessage = users.map((user) => {
      const lastMsg = messages.find(
        (m) =>
          m.senderId.toString() === user._id.toString() ||
          m.receiverId.toString() === user._id.toString()
      );
      return { ...user.toObject(), lastMessage: lastMsg };
    });

    res.json({ success: true, data: { users: usersWithLastMessage } });
  } catch (err) {
    next(err);
  }
};
