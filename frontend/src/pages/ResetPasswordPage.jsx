import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function ResetPasswordPage() {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("Reset OTP was sent to your email when you clicked the link.");
  const [error, setError] = useState("");
  const [nextResendAt, setNextResendAt] = useState(null);
  const navigate = useNavigate();

  const cooldown = useMemo(() => {
    if (!nextResendAt) return 0;
    return Math.max(0, Math.ceil((new Date(nextResendAt).getTime() - Date.now()) / 1000));
  }, [nextResendAt, message]);

  useEffect(() => {
    if (!nextResendAt) return;
    const t = setInterval(() => setMessage((m) => m), 1000);
    return () => clearInterval(t);
  }, [nextResendAt]);

  async function resendOtp() {
    setMessage("");
    setError("");
    try {
      const data = await api("/auth/forgot-password/resend-otp", { method: "POST" });
      setMessage(data.message);
      setNextResendAt(data.nextResendAt || null);
    } catch (err) {
      setError(err.message);
      if (err.data?.nextResendAt) setNextResendAt(err.data.nextResendAt);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const data = await api("/auth/forgot-password/complete", {
        method: "POST",
        body: { otp, newPassword }
      });
      setMessage(data.message);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h2>Reset Password</h2>
      <p>Enter OTP from email and set a new password.</p>
      <button onClick={resendOtp} disabled={cooldown > 0}>
        {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
      </button>
      <form onSubmit={submit} style={{ display: "grid", gap: 10, maxWidth: 380 }}>
        <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" />
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" />
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
        <button type="submit">Reset Password</button>
      </form>
      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}
