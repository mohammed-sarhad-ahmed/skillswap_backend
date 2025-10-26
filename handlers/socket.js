import { Server } from "socket.io";
import Message from "../models/messages.js";

let io;
const onlineUsers = new Map(); // track online users

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" }, // replace with frontend URL in production
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // register user when they login/connect
    socket.on("register_user", (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log(`User registered: ${userId}`);
    });

    // join a specific chat room
    socket.on("join_chat", ({ userId, otherUserId }) => {
      const roomId = [userId, otherUserId].sort().join("_");
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // handle sending messages
    socket.on("send_message", async (data) => {
      try {
        const roomId = [data.senderId, data.receiverId].sort().join("_");
        socket.join(roomId); // make sure socket in the room

        // save message in DB
        const msgDoc = new Message({ ...data, roomId });
        await msgDoc.save();

        // emit to chat room (for active chat)
        io.to(roomId).emit("receive_message", msgDoc);

        // ✅ send directly to receiver if online (for sidebar)
        const receiverSocket = onlineUsers.get(data.receiverId);
        if (receiverSocket && receiverSocket !== socket.id) {
          io.to(receiverSocket).emit("receive_message_global", msgDoc);
        }
      } catch (err) {
        console.error("Failed to save/send message:", err);
      }
    });

    socket.on("disconnect", () => {
      for (const [userId, id] of onlineUsers.entries()) {
        if (id === socket.id) onlineUsers.delete(userId);
      }
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
};
