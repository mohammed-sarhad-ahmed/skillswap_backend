import { Server } from "socket.io";
import Message from "../models/messages.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" }, // replace with frontend URL in production
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join a chat room for real-time messages
    socket.on("join_chat", ({ userId, otherUserId }) => {
      const roomId = [userId, otherUserId].sort().join("_");
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // Handle sending messages
    socket.on("send_message", async (data) => {
      try {
        const roomId = [data.senderId, data.receiverId].sort().join("_");
        socket.join(roomId); // ensure socket is in the room

        // Save message in database
        const msgDoc = new Message({ ...data, roomId });
        await msgDoc.save();

        // Emit the saved message to everyone in the room
        io.to(roomId).emit("receive_message", msgDoc);
      } catch (err) {
        console.error("Failed to save/send message:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};
