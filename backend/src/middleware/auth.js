import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function requireSession(req, res, next) {
  const token = req.cookies.sessionToken;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    req.session = jwt.verify(token, env.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid session" });
  }
}

export function requireSemiVerified(req, res, next) {
  const token = req.cookies.verificationToken;
  if (!token) return res.status(401).json({ message: "Verification session required" });
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.type !== "verify") return res.status(401).json({ message: "Invalid verification session" });
    req.verification = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Expired verification session" });
  }
}

export function requirePasswordReset(req, res, next) {
  const token = req.cookies.passwordResetToken;
  if (!token) return res.status(401).json({ message: "Password reset session required" });
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.type !== "password_reset") return res.status(401).json({ message: "Invalid password reset session" });
    req.passwordReset = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Expired password reset session" });
  }
}
