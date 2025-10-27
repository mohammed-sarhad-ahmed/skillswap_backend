import { Server } from "socket.io";
import Message from "../models/messages.js";
import { UserModel } from "../models/user.js"; // make sure this is your User schema

let io;
const onlineUsers = new Map(); // track online users

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Register user
    socket.on("register_user", (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log(`User registered: ${userId}`);
    });

    // Join chat room
    socket.on("join_chat", ({ userId, otherUserId }) => {
      const roomId = [userId, otherUserId].sort().join("_");
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // Messages
    socket.on("send_message", async (data) => {
      try {
        const roomId = [data.senderId, data.receiverId].sort().join("_");
        socket.join(roomId);

        const msgDoc = new Message({ ...data, roomId });
        await msgDoc.save();

        io.to(roomId).emit("receive_message", msgDoc);

        const receiverSocket = onlineUsers.get(data.receiverId);
        if (receiverSocket && receiverSocket !== socket.id) {
          io.to(receiverSocket).emit("receive_message_global", msgDoc);
        }
      } catch (err) {
        console.error("Failed to save/send message:", err);
      }
    });

    /** CONNECTION REQUESTS **/

    // Send connection request
    socket.on("send_connection_request", async ({ from, to }) => {
      try {
        const fromUser = await UserModel.findById(from);
        const toUser = await UserModel.findById(to);
        if (!fromUser || !toUser) return;

        if (!fromUser.sentRequests.includes(to)) fromUser.sentRequests.push(to);
        if (!toUser.receivedRequests.includes(from))
          toUser.receivedRequests.push(from);
        await fromUser.save();
        await toUser.save();

        const toSocket = onlineUsers.get(to);
        if (toSocket) {
          io.to(toSocket).emit("connection_request", { from, to });
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Accept request
    socket.on("accept_connection_request", async ({ from, to }) => {
      try {
        const fromUser = await UserModel.findById(from);
        const toUser = await UserModel.findById(to);
        if (!fromUser || !toUser) return;

        // Update connections
        fromUser.connections.push(to);
        toUser.connections.push(from);

        // Remove from requests
        fromUser.sentRequests = fromUser.sentRequests.filter((id) => id != to);
        toUser.receivedRequests = toUser.receivedRequests.filter(
          (id) => id != from
        );

        await fromUser.save();
        await toUser.save();

        io.to(onlineUsers.get(from))?.emit("connection_update", {
          from,
          to,
          status: "accepted",
        });
        io.to(onlineUsers.get(to))?.emit("connection_update", {
          from,
          to,
          status: "accepted",
        });
      } catch (err) {
        console.error(err);
      }
    });

    // Cancel / Unconnect
    socket.on("cancel_connection_request", async ({ from, to }) => {
      try {
        const fromUser = await UserModel.findById(from);
        const toUser = await UserModel.findById(to);
        if (!fromUser || !toUser) return;

        // Remove requests/connections
        fromUser.sentRequests = fromUser.sentRequests.filter((id) => id != to);
        fromUser.connections = fromUser.connections.filter((id) => id != to);
        toUser.receivedRequests = toUser.receivedRequests.filter(
          (id) => id != from
        );
        toUser.connections = toUser.connections.filter((id) => id != from);

        await fromUser.save();
        await toUser.save();

        io.to(onlineUsers.get(from))?.emit("connection_update", {
          from,
          to,
          status: "cancelled",
        });
        io.to(onlineUsers.get(to))?.emit("connection_update", {
          from,
          to,
          status: "cancelled",
        });
      } catch (err) {
        console.error(err);
      }
    });

    /** END CONNECTION REQUESTS **/

    socket.on("disconnect", () => {
      for (const [userId, id] of onlineUsers.entries()) {
        if (id === socket.id) onlineUsers.delete(userId);
      }
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
};
