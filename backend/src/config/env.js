import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  backendUrl: process.env.BACKEND_URL || "http://localhost:5000",
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  verificationTokenTtlMin: Number(process.env.VERIFICATION_TOKEN_TTL_MIN || 30),
  otpTtlMin: Number(process.env.OTP_TTL_MIN || 5),
  otpCooldownSec: Number(process.env.OTP_COOLDOWN_SEC || 60),
  otpDailyLimit: Number(process.env.OTP_DAILY_LIMIT || 10),
  mailFrom: process.env.MAIL_FROM || "no-reply@example.com",
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: String(process.env.SMTP_SECURE || "false") === "true",
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS
};
