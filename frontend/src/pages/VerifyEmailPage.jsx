import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_BASE } from "../api/client";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("Verifying email link...");

  useEffect(() => {
    async function verify() {
      const token = params.get("token");
      if (!token) {
        setMessage("Missing token");
        return;
      }
      window.location.assign(`${API_BASE}/auth/verify-email-link?token=${encodeURIComponent(token)}`);
    }
    verify();
  }, [params]);

  return <p>{message}</p>;
}
