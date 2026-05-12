import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    verificationStatus: {
      type: String,
      enum: ["unverified", "semi_verified", "verified"],
      default: "unverified"
    },
    emailVerifiedAt: { type: Date, default: null },
    otpVerifiedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
