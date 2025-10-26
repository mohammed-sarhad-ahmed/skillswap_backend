import express from "express";
import {
  getMessages,
  getConversations,
  getChatUsers,
  markMessagesRead,
} from "../handlers/messages.js";
import { protectRoute } from "../handlers/auth.js";

const router = express.Router();

router.use(protectRoute);

router.get("/", getChatUsers);
router.get("/conversations", getConversations); // all chats
router.get("/:roomId", getMessages); // messages in room
router.post("/mark_read/:userId", markMessagesRead);

export default router;
