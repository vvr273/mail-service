import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import { env } from "./config/env.js";

const app = express();

const allowedOrigin = String(env.frontendUrl || "").replace(/\/$/, "");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      return callback(null, origin.replace(/\/$/, "") === allowedOrigin);
    },
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRoutes);

export default app;
