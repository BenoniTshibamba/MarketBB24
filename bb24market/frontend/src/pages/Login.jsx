import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = await login(email, password);
      nav(u.role === "seller" ? "/seller" : "/");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <form className="form-card" onSubmit={submit}>
        <h2>Welcome back! 👋</h2>
        <p className="form-sub">We missed you. Let's get you signed in.</p>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Signing you in…" : "Sign in ✨"}
        </button>
        <p style={{ textAlign: "center", marginTop: 16, fontWeight: 600, color: "var(--ink-soft)" }}>
          New here? <Link to="/register" style={{ color: "var(--primary-dark)", fontWeight: 800 }}>Create a free account</Link>
        </p>
      </form>
    </div>
  );
}
