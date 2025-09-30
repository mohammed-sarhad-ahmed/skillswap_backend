import express from "express";
import dotenv from "dotenv";
import authRouter from "./routers/auth.js";
import { handleError } from "./handlers/error.js";

dotenv.config();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.use("/auth", authRouter);

app.use(express.static("public"));

app.all("/{*everything}", (req, res, next) => {
  next(new AppError("route not found", 404));
});

app.use(handleError);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
