import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { EmailVerificationToken } from "../models/EmailVerificationToken.js";
import { OtpVerification } from "../models/OtpVerification.js";
import { PasswordResetToken } from "../models/PasswordResetToken.js";
import { PasswordResetOtp } from "../models/PasswordResetOtp.js";
import { env } from "../config/env.js";
import { generateOtp, hashValue, randomToken } from "../utils/crypto.js";
import { addMinutes, addSeconds, dayKey } from "../utils/time.js";
import { sendMail } from "../services/mailService.js";
import { requirePasswordReset, requireSemiVerified, requireSession } from "../middleware/auth.js";

const router = express.Router();

const isProduction = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction
};

function setSessionCookie(res, user) {
  const token = jwt.sign({ sub: String(user._id), type: "session" }, env.jwtSecret, { expiresIn: "7d" });
  res.cookie("sessionToken", token, cookieOptions);
}

function setVerificationCookie(res, user) {
  const token = jwt.sign({ sub: String(user._id), type: "verify" }, env.jwtSecret, { expiresIn: "30m" });
  res.cookie("verificationToken", token, cookieOptions);
}

function setPasswordResetCookie(res, user) {
  const token = jwt.sign({ sub: String(user._id), type: "password_reset" }, env.jwtSecret, { expiresIn: "30m" });
  res.cookie("passwordResetToken", token, cookieOptions);
}

function clearAllAuthCookies(res) {
  res.clearCookie("sessionToken", cookieOptions);
  res.clearCookie("verificationToken", cookieOptions);
  res.clearCookie("passwordResetToken", cookieOptions);
}

async function issueEmailVerification(user) {
  const token = randomToken(24);
  const tokenHash = hashValue(token);
  const now = new Date();
  await EmailVerificationToken.create({
    userId: user._id,
    tokenHash,
    expiresAt: addMinutes(now, env.verificationTokenTtlMin)
  });
  const verifyUrl = `${env.backendUrl}/auth/verify-email-link?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: user.email,
    subject: "Verify your email",
    html: `<p>Hello ${user.name},</p><p>Click the link to verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`
  });
}

async function sendOtpForUser(user) {
  const now = new Date();
  const key = dayKey(now);
  const otp = generateOtp(6);
  const otpHash = hashValue(otp);

  let record = await OtpVerification.findOne({ userId: user._id });
  if (!record) record = new OtpVerification({ userId: user._id, resendDayKey: key });

  if (record.resendDayKey !== key) {
    record.resendDayKey = key;
    record.resendCountDaily = 0;
  }

  if (record.lastSentAt && now < addSeconds(record.lastSentAt, env.otpCooldownSec)) {
    const err = new Error("Cooldown active");
    err.code = "COOLDOWN";
    err.nextResendAt = addSeconds(record.lastSentAt, env.otpCooldownSec);
    throw err;
  }

  if (record.resendCountDaily >= env.otpDailyLimit) {
    const err = new Error("Daily resend limit reached");
    err.code = "DAILY_LIMIT";
    throw err;
  }

  record.otpHash = otpHash;
  record.expiresAt = addMinutes(now, env.otpTtlMin);
  record.attempts = 0;
  record.lastSentAt = now;
  record.resendCountDaily += 1;
  record.consumedAt = null;
  await record.save();

  await sendMail({
    to: user.email,
    subject: "Your verification OTP",
    html: `<p>Your OTP is <strong>${otp}</strong>.</p><p>It expires in ${env.otpTtlMin} minutes.</p>`
  });

  return {
    nextResendAt: addSeconds(now, env.otpCooldownSec),
    remainingDailyResends: Math.max(0, env.otpDailyLimit - record.resendCountDaily)
  };
}

async function sendResetOtpForUser(user) {
  const now = new Date();
  const key = dayKey(now);
  const otp = generateOtp(6);
  const otpHash = hashValue(otp);

  let record = await PasswordResetOtp.findOne({ userId: user._id });
  if (!record) record = new PasswordResetOtp({ userId: user._id, resendDayKey: key });

  if (record.resendDayKey !== key) {
    record.resendDayKey = key;
    record.resendCountDaily = 0;
  }

  if (record.lastSentAt && now < addSeconds(record.lastSentAt, env.otpCooldownSec)) {
    const err = new Error("Cooldown active");
    err.code = "COOLDOWN";
    err.nextResendAt = addSeconds(record.lastSentAt, env.otpCooldownSec);
    throw err;
  }

  if (record.resendCountDaily >= env.otpDailyLimit) {
    const err = new Error("Daily resend limit reached");
    err.code = "DAILY_LIMIT";
    throw err;
  }

  record.otpHash = otpHash;
  record.expiresAt = addMinutes(now, env.otpTtlMin);
  record.attempts = 0;
  record.lastSentAt = now;
  record.resendCountDaily += 1;
  record.consumedAt = null;
  await record.save();

  await sendMail({
    to: user.email,
    subject: "Your password reset OTP",
    html: `<p>Your password reset OTP is <strong>${otp}</strong>.</p><p>It expires in ${env.otpTtlMin} minutes.</p>`
  });

  return {
    nextResendAt: addSeconds(now, env.otpCooldownSec),
    remainingDailyResends: Math.max(0, env.otpDailyLimit - record.resendCountDaily)
  };
}

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "name, email, password are required" });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });
    await issueEmailVerification(user);
    setSessionCookie(res, user);

    return res.status(201).json({ message: "Signup complete. Check your email for verification link.", verificationStatus: user.verificationStatus });
  } catch (error) {
    return res.status(500).json({ message: "Signup failed", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || "").toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await bcrypt.compare(password || "", user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    setSessionCookie(res, user);
    return res.json({ message: "Login successful", verificationStatus: user.verificationStatus });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
});

router.post("/forgot-password/request", async (req, res) => {
  try {
    const email = String(req.body.email || "").toLowerCase();
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: "If this email exists, a reset link has been sent." });
    }

    const token = randomToken(24);
    await PasswordResetToken.create({
      userId: user._id,
      tokenHash: hashValue(token),
      expiresAt: addMinutes(new Date(), env.verificationTokenTtlMin)
    });

    const resetLink = `${env.backendUrl}/auth/forgot-password/verify-link?token=${encodeURIComponent(token)}`;
    await sendMail({
      to: user.email,
      subject: "Reset your password",
      html: `<p>Hello ${user.name},</p><p>Click this link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`
    });

    return res.json({ message: "If this email exists, a reset link has been sent." });
  } catch (error) {
    return res.status(500).json({ message: "Forgot password request failed", error: error.message });
  }
});

router.get("/forgot-password/verify-link", async (req, res) => {
  try {
    const raw = String(req.query.token || "");
    if (!raw) return res.status(400).json({ message: "Missing token" });

    const rec = await PasswordResetToken.findOne({ tokenHash: hashValue(raw) });
    if (!rec) return res.status(400).json({ message: "Invalid token" });
    if (rec.consumedAt) return res.status(400).json({ message: "Token already used" });
    if (rec.expiresAt < new Date()) return res.status(400).json({ message: "Token expired" });

    rec.consumedAt = new Date();
    await rec.save();

    const user = await User.findById(rec.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    setPasswordResetCookie(res, user);
    await sendResetOtpForUser(user);

    return res.redirect(`${env.frontendUrl}/reset-password`);
  } catch (error) {
    return res.status(500).json({ message: "Password reset link validation failed", error: error.message });
  }
});

router.post("/forgot-password/resend-otp", requirePasswordReset, async (req, res) => {
  try {
    const user = await User.findById(req.passwordReset.sub);
    if (!user) return res.status(404).json({ message: "User not found" });
    const payload = await sendResetOtpForUser(user);
    return res.json({ message: "OTP resent", ...payload });
  } catch (error) {
    if (error.code === "COOLDOWN") {
      return res.status(429).json({ message: "Please wait before resending", code: error.code, nextResendAt: error.nextResendAt });
    }
    if (error.code === "DAILY_LIMIT") {
      return res.status(429).json({ message: "Daily resend limit reached", code: error.code });
    }
    return res.status(500).json({ message: "Failed to resend OTP", error: error.message });
  }
});

router.post("/forgot-password/complete", requirePasswordReset, async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.passwordReset.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    const rec = await PasswordResetOtp.findOne({ userId: user._id });
    if (!rec || !rec.otpHash || !rec.expiresAt) return res.status(400).json({ message: "OTP not requested" });
    if (rec.consumedAt) return res.status(400).json({ message: "OTP already consumed" });
    if (rec.expiresAt < new Date()) return res.status(400).json({ message: "OTP expired" });

    rec.attempts += 1;
    if (rec.otpHash !== hashValue(String(otp || ""))) {
      await rec.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    rec.consumedAt = new Date();
    await rec.save();

    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    await user.save();

    clearAllAuthCookies(res);
    return res.json({ message: "Password reset successful. Please login with new password." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to complete password reset", error: error.message });
  }
});

router.post("/send-verification-email", requireSession, async (req, res) => {
  try {
    const user = await User.findById(req.session.sub);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.verificationStatus === "verified") return res.status(400).json({ message: "Already verified" });
    await issueEmailVerification(user);
    return res.json({ message: "Verification email sent" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to send verification email", error: error.message });
  }
});

router.get("/verify-email-link", async (req, res) => {
  try {
    const raw = String(req.query.token || "");
    if (!raw) return res.status(400).json({ message: "Missing token" });
    const tokenHash = hashValue(raw);

    const rec = await EmailVerificationToken.findOne({ tokenHash });
    if (!rec) return res.status(400).json({ message: "Invalid token" });
    if (rec.consumedAt) return res.status(400).json({ message: "Token already used" });
    if (rec.expiresAt < new Date()) return res.status(400).json({ message: "Token expired" });

    rec.consumedAt = new Date();
    await rec.save();

    const user = await User.findById(rec.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.verificationStatus !== "verified") {
      user.verificationStatus = "semi_verified";
      user.emailVerifiedAt = new Date();
      await user.save();
    }

    setVerificationCookie(res, user);
    return res.redirect(`${env.frontendUrl}/verification`);
  } catch (error) {
    return res.status(500).json({ message: "Link verification failed", error: error.message });
  }
});

router.post("/otp/send", requireSemiVerified, async (req, res) => {
  try {
    const user = await User.findById(req.verification.sub);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.verificationStatus !== "semi_verified") return res.status(400).json({ message: "User is not in semi-verified state" });
    const payload = await sendOtpForUser(user);
    return res.json({ message: "OTP sent", ...payload });
  } catch (error) {
    if (error.code === "COOLDOWN") {
      return res.status(429).json({ message: "Please wait before resending", code: error.code, nextResendAt: error.nextResendAt });
    }
    if (error.code === "DAILY_LIMIT") {
      return res.status(429).json({ message: "Daily resend limit reached", code: error.code });
    }
    return res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
});

router.post("/otp/resend", requireSemiVerified, async (req, res) => {
  try {
    const user = await User.findById(req.verification.sub);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.verificationStatus !== "semi_verified") return res.status(400).json({ message: "User is not in semi-verified state" });
    const payload = await sendOtpForUser(user);
    return res.json({ message: "OTP resent", ...payload });
  } catch (error) {
    if (error.code === "COOLDOWN") {
      return res.status(429).json({ message: "Please wait before resending", code: error.code, nextResendAt: error.nextResendAt });
    }
    if (error.code === "DAILY_LIMIT") {
      return res.status(429).json({ message: "Daily resend limit reached", code: error.code });
    }
    return res.status(500).json({ message: "Failed to resend OTP", error: error.message });
  }
});

router.post("/otp/verify", requireSemiVerified, async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.verification.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    const rec = await OtpVerification.findOne({ userId: user._id });
    if (!rec || !rec.otpHash || !rec.expiresAt) return res.status(400).json({ message: "OTP not requested" });
    if (rec.consumedAt) return res.status(400).json({ message: "OTP already consumed" });
    if (rec.expiresAt < new Date()) return res.status(400).json({ message: "OTP expired" });

    rec.attempts += 1;

    if (rec.otpHash !== hashValue(String(otp || ""))) {
      await rec.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    rec.consumedAt = new Date();
    await rec.save();

    user.verificationStatus = "verified";
    user.otpVerifiedAt = new Date();
    await user.save();

    clearAllAuthCookies(res);

    return res.json({
      verified: true,
      verificationStatus: user.verificationStatus,
      forceRelogin: true,
      profile: { name: user.name, email: user.email }
    });
  } catch (error) {
    return res.status(500).json({ message: "OTP verification failed", error: error.message });
  }
});

router.get("/verification-status", async (req, res) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    const verifyToken = req.cookies.verificationToken;

    let userId = null;
    if (verifyToken) {
      try {
        const payload = jwt.verify(verifyToken, env.jwtSecret);
        userId = payload.sub;
      } catch {
        userId = null;
      }
    }

    if (!userId && sessionToken) {
      try {
        const payload = jwt.verify(sessionToken, env.jwtSecret);
        userId = payload.sub;
      } catch {
        userId = null;
      }
    }

    if (!userId) return res.json({ verificationStatus: "unverified" });

    const user = await User.findById(userId);
    if (!user) return res.json({ verificationStatus: "unverified" });

    return res.json({
      verificationStatus: user.verificationStatus,
      profile: { name: user.name, email: user.email }
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not get verification status", error: error.message });
  }
});

router.post("/logout", (_req, res) => {
  clearAllAuthCookies(res);
  return res.json({ message: "Logged out" });
});

export default router;
