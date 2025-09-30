import express from "express";

const router = express.Router();

router.post("/sign-up", (req, res) => {
  // Handle user sign-up
  res.send("User signed up");
});

router.post("/login", (req, res) => {
  // Handle user login
  res.send("User logged in");
});

export default router;
