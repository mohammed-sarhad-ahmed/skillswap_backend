import { Server } from "socket.io";
import Message from "../models/messages.js";
import { UserModel } from "../models/user.js";
import { Notification } from "../models/notification.js";

let io;
const onlineUsers = new Map();

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    socket.on("register_user", (userId) => {
      if (userId) onlineUsers.set(userId, socket.id);
    });

    // ✅ Join chat
    socket.on("join_chat", ({ userId, otherUserId }) => {
      const roomId = [userId, otherUserId].sort().join("_");
      socket.join(roomId);
    });

    // ✅ Send message
    socket.on("send_message", async (data) => {
      try {
        const { senderId, receiverId, content } = data;
        const roomId = [senderId, receiverId].sort().join("_");
        const msgDoc = new Message({ ...data, roomId });
        await msgDoc.save();

        io.to(roomId).emit("receive_message", msgDoc);

        const receiverSocket = onlineUsers.get(receiverId);
        if (receiverSocket)
          io.to(receiverSocket).emit("receive_message_global", msgDoc);

        const notif = new Notification({
          user: receiverId,
          type: "message",
          from: senderId,
          content: `New message: ${content.slice(0, 50)}...`,
        });
        await notif.save();

        if (receiverSocket) io.to(receiverSocket).emit("notification", notif);
      } catch (err) {
        console.error("❌ Message send failed:", err);
      }
    });

    // ✅ Send connection request
    socket.on("send_connection_request", async ({ from, to }) => {
      try {
        const fromUser = await UserModel.findById(from);
        const toUser = await UserModel.findById(to);
        if (!fromUser || !toUser) return;

        // Remove old pending notifs from same sender before sending new
        await Notification.deleteMany({
          user: to,
          from,
          type: "connection_request",
        });

        if (!fromUser.sentRequests.includes(to)) fromUser.sentRequests.push(to);
        if (!toUser.receivedRequests.includes(from))
          toUser.receivedRequests.push(from);
        await fromUser.save();
        await toUser.save();

        const notif = new Notification({
          user: to,
          type: "connection_request",
          from,
          content: `${
            fromUser.fullName || "Someone"
          } sent you a connection request.`,
          read: false,
        });
        await notif.save();

        const toSocket = onlineUsers.get(to);
        if (toSocket) {
          io.to(toSocket).emit("connection_request", { from, to });
          io.to(toSocket).emit("notification", {
            ...notif.toObject(),
            isNew: true, // 🔹 mark this as new
          });
        }
      } catch (err) {
        console.error("❌ send_connection_request error:", err);
      }
    });

    // ✅ Accept connection
    socket.on("accept_connection_request", async ({ notifId, from, to }) => {
      try {
        const fromUser = await UserModel.findById(from);
        const toUser = await UserModel.findById(to);
        if (!fromUser || !toUser) return;

        if (!fromUser.connections.includes(to)) fromUser.connections.push(to);
        if (!toUser.connections.includes(from)) toUser.connections.push(from);

        fromUser.sentRequests = fromUser.sentRequests.filter((id) => id != to);
        toUser.receivedRequests = toUser.receivedRequests.filter(
          (id) => id != from
        );

        await fromUser.save();
        await toUser.save();

        // Remove old notifs between these users
        await Notification.deleteMany({
          $or: [
            { user: from, from: to },
            { user: to, from },
          ],
        });

        const notif = new Notification({
          user: from,
          type: "connection_request",
          from: to,
          content: `${
            toUser.fullName || "Someone"
          } accepted your connection request.`,
        });
        await notif.save();

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

        if (onlineUsers.get(from))
          io.to(onlineUsers.get(from)).emit("notification", notif);
      } catch (err) {
        console.error("❌ accept_connection_request error:", err);
      }
    });

    // ✅ Reject connection
    socket.on("reject_connection_request", async ({ notifId, from, to }) => {
      try {
        const fromUser = await UserModel.findById(from);
        const toUser = await UserModel.findById(to);
        if (!fromUser || !toUser) return;

        fromUser.sentRequests = fromUser.sentRequests.filter((id) => id != to);
        toUser.receivedRequests = toUser.receivedRequests.filter(
          (id) => id != from
        );

        await fromUser.save();
        await toUser.save();

        // remove old notifications between them
        await Notification.deleteMany({
          $or: [
            { user: from, from: to },
            { user: to, from },
          ],
        });

        const notif = new Notification({
          user: from,
          type: "connection_request",
          from: to,
          content: `${
            toUser.fullName || "Someone"
          } rejected your connection request.`,
        });
        await notif.save();

        io.to(onlineUsers.get(from))?.emit("connection_update", {
          from,
          to,
          status: "rejected",
        });
        if (onlineUsers.get(from))
          io.to(onlineUsers.get(from)).emit("notification", notif);
      } catch (err) {
        console.error("❌ reject_connection_request error:", err);
      }
    });

    // ✅ Disconnect/unconnect — remove all old notifs
    socket.on("cancel_connection_request", async ({ from, to }) => {
      try {
        const fromUser = await UserModel.findById(from);
        const toUser = await UserModel.findById(to);
        if (!fromUser || !toUser) return;

        fromUser.sentRequests = fromUser.sentRequests.filter((id) => id != to);
        fromUser.connections = fromUser.connections.filter((id) => id != to);
        toUser.receivedRequests = toUser.receivedRequests.filter(
          (id) => id != from
        );
        toUser.connections = toUser.connections.filter((id) => id != from);

        await fromUser.save();
        await toUser.save();

        await Notification.deleteMany({
          $or: [
            { user: from, from: to },
            { user: to, from },
          ],
        });

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
        console.error("❌ cancel_connection_request error:", err);
      }
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) onlineUsers.delete(userId);
      }
    });
  });

  return io;
};
