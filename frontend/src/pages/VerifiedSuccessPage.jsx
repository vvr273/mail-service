import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function VerifiedSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = location.state;

  useEffect(() => {
    const t = setTimeout(() => navigate("/login"), 2500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div>
      <h2>You are verified</h2>
      <p>Please login again to continue.</p>
      {profile && (
        <p>
          Profile: {profile.name} ({profile.email})
        </p>
      )}
    </div>
  );
}
