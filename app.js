import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";

import authRouter from "./routers/auth.js";
import userRouter from "./routers/user.js";
import appointmentsRouter from "./routers/appointments.js";
import { handleError } from "./handlers/error.js";
import AppError from "./utils/app_error.js";
import { initSocket } from "./handlers/socket.js"; // import socket module
import messageRouter from "./routers/messages.js";

dotenv.config();

mongoose
  .connect(
    `mongodb://${process.env.DB_ADDRESS}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });

const app = express();
app.use(express.json());
app.use(cors());

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/messages", messageRouter);
app.use("/appointments", appointmentsRouter);

app.use(express.static("public"));

app.all("/{*everything}", (req, res, next) => {
  next(new AppError("route not found", 404));
  console.log("404 error");
});

app.use(handleError);

// create HTTP server and attach Socket.IO
const PORT = process.env.SERVER_PORT || 3000;
const HOST = process.env.SERVER_ADDRESS || "localhost";
const server = http.createServer(app);

// initialize socket
initSocket(server);

server.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
