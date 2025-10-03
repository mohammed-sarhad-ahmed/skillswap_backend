import crypto from "crypto";

export default function generateResetToken() {
  const resetToken = crypto.randomBytes(32).toString("hex");
  return resetToken;
}
