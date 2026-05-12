import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [profile, setProfile] = useState(null);

  async function refreshStatus() {
    try {
      const data = await api("/auth/verification-status");
      setStatus(data.verificationStatus || "unverified");
      setProfile(data.profile || null);
    } catch {
      setStatus("unverified");
      setProfile(null);
    }
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ status, profile, refreshStatus, setStatus, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
