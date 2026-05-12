import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Verifying email link...");

  useEffect(() => {
    async function verify() {
      const token = params.get("token");
      if (!token) {
        setMessage("Missing token");
        return;
      }
      try {
        await fetch(`http://localhost:5000/auth/verify-email-link?token=${encodeURIComponent(token)}`, {
          credentials: "include"
        });
        navigate("/verification");
      } catch {
        setMessage("Verification link failed");
      }
    }
    verify();
  }, [params, navigate]);

  return <p>{message}</p>;
}
