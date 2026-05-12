import { useState } from "react";
import { api } from "../api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const data = await api("/auth/forgot-password/request", {
        method: "POST",
        body: { email }
      });
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
      <h2>Forgot Password</h2>
      <input
        type="email"
        placeholder="Enter your account email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit">Send reset link</button>
      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </form>
  );
}
