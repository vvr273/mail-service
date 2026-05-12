import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function VerificationPage() {
  const { status, profile, refreshStatus, setStatus, setProfile } = useAuth();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [nextResendAt, setNextResendAt] = useState(null);
  const [remainingDailyResends, setRemainingDailyResends] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const cooldown = useMemo(() => {
    if (!nextResendAt) return 0;
    return Math.max(0, Math.ceil((new Date(nextResendAt).getTime() - Date.now()) / 1000));
  }, [nextResendAt, message]);

  useEffect(() => {
    if (!nextResendAt) return;
    const t = setInterval(() => setMessage((m) => m), 1000);
    return () => clearInterval(t);
  }, [nextResendAt]);

  async function sendOtp(path) {
    setError("");
    setMessage("");
    try {
      const data = await api(path, { method: "POST" });
      setMessage(data.message);
      setNextResendAt(data.nextResendAt || null);
      setRemainingDailyResends(data.remainingDailyResends ?? null);
    } catch (err) {
      setError(err.message);
      if (err.data?.nextResendAt) setNextResendAt(err.data.nextResendAt);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const data = await api("/auth/otp/verify", { method: "POST", body: { otp } });
      setStatus(data.verificationStatus);
      setProfile(data.profile);
      navigate("/verified-success", { state: data.profile });
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendVerificationEmail() {
    setError("");
    setMessage("");
    try {
      const data = await api("/auth/send-verification-email", { method: "POST" });
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h2>Verification Center</h2>
      <p><strong>Status:</strong> {status}</p>
      {profile && <p><strong>User:</strong> {profile.name} ({profile.email})</p>}

      {status === "unverified" && (
        <button onClick={sendVerificationEmail}>Send verification email</button>
      )}

      {status === "semi_verified" && (
        <>
          <button onClick={() => sendOtp("/auth/otp/send")}>Send OTP</button>
          <button onClick={() => sendOtp("/auth/otp/resend")} disabled={cooldown > 0}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
          </button>
          {remainingDailyResends !== null && <p>Remaining daily resends: {remainingDailyResends}</p>}
          <form onSubmit={verifyOtp} style={{ display: "grid", gap: 10, maxWidth: 320 }}>
            <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" />
            <button type="submit">Verify OTP</button>
          </form>
        </>
      )}

      {status === "verified" && <p>You are fully verified.</p>}

      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}
