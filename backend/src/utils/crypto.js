import crypto from "crypto";

export function randomToken(size = 32) {
  return crypto.randomBytes(size).toString("hex");
}

export function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateOtp(digits = 6) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}
