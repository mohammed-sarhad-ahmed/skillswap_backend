import express from "express";
import dotenv from "dotenv";
import authRouter from "./routers/auth.js";
import handleError from "./handlers/error.js";
import AppError from "./utils/app_error.js";
import mongoose from "mongoose";
import cors from "cors";

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

const PORT = process.env.SERVER_PORT || 3000;
const HOST = process.env.SERVER_ADDRESS || "localhost";

app.use("/auth", authRouter);

app.use(express.static("public"));

app.all("/{*everything}", (req, res, next) => {
  next(new AppError("route not found", 404));
  console.log("404 error");
});

app.use(handleError);

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
