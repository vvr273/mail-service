import { Link } from "react-router-dom";

export default function Layout({ children }) {
  return (
    <div style={{ maxWidth: 680, margin: "40px auto", fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h1>Mail Verification Service</h1>
      <nav style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <Link to="/">Signup</Link>
        <Link to="/login">Login</Link>
        <Link to="/forgot-password">Forgot Password</Link>
        <Link to="/verification">Verification</Link>
      </nav>
      <div>{children}</div>
    </div>
  );
}
