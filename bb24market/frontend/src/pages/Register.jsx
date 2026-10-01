import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth();
  const [role, setRole] = useState("buyer");
  const [sellerType, setSellerType] = useState("individual");
  const [form, setForm] = useState({ name: "", email: "", password: "", company_name: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role,
        seller_type: role === "seller" ? sellerType : null,
        company_name: role === "seller" && sellerType === "company" ? form.company_name : null,
      };
      const u = await register(payload);
      nav(u.role === "seller" ? "/seller" : "/");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const roleCard = (value, emoji, title, text) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      style={{
        flex: 1,
        border: role === value ? "3px solid var(--primary)" : "2px solid var(--line)",
        background: role === value ? "var(--primary-soft)" : "var(--bg)",
        borderRadius: "var(--radius)",
        padding: "16px 10px",
        cursor: "pointer",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "1.8rem" }}>{emoji}</div>
      <div style={{ fontWeight: 900, marginTop: 4 }}>{title}</div>
      <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>{text}</div>
    </button>
  );

  return (
    <div className="container page">
      <form className="form-card wide" onSubmit={submit} style={{ maxWidth: 560 }}>
        <h2>Join BB24Market ✨</h2>
        <p className="form-sub">Free forever. Buy wonderful things — or sell them.</p>
        {error && <div className="form-error">{error}</div>}

        <div className="field">
          <label>I want to…</label>
          <div style={{ display: "flex", gap: 12 }}>
            {roleCard("buyer", "🛍️", "Shop", "Buy from great sellers")}
            {roleCard("seller", "🏪", "Sell", "Open your own shop")}
          </div>
        </div>

        {role === "seller" && (
          <div className="field">
            <label>Selling as…</label>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={() => setSellerType("individual")}
                style={{
                  flex: 1,
                  border: sellerType === "individual" ? "3px solid var(--primary)" : "2px solid var(--line)",
                  background: sellerType === "individual" ? "var(--primary-soft)" : "var(--bg)",
                  borderRadius: "var(--radius)", padding: "14px 10px", cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "1.6rem" }}>🙂</div>
                <div style={{ fontWeight: 900 }}>Individual</div>
                <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>Just me, selling my stuff</div>
              </button>
              <button
                type="button"
                onClick={() => setSellerType("company")}
                style={{
                  flex: 1,
                  border: sellerType === "company" ? "3px solid var(--primary)" : "2px solid var(--line)",
                  background: sellerType === "company" ? "var(--primary-soft)" : "var(--bg)",
                  borderRadius: "var(--radius)", padding: "14px 10px", cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "1.6rem" }}>🏢</div>
                <div style={{ fontWeight: 900 }}>Company</div>
                <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>Selling as a business</div>
              </button>
            </div>
          </div>
        )}

        <div className="field-row">
          <div className="field">
            <label>{role === "seller" && sellerType === "individual" ? "Your name" : "Full name"}</label>
            <input value={form.name} onChange={set("name")} required placeholder="Jane Doe" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set("email")} required placeholder="you@example.com" />
          </div>
        </div>
        {role === "seller" && sellerType === "company" && (
          <div className="field">
            <label>Company name</label>
            <input value={form.company_name} onChange={set("company_name")} required placeholder="Acme Inc." />
          </div>
        )}
        <div className="field">
          <label>Password</label>
          <input type="password" value={form.password} onChange={set("password")} required minLength={6} placeholder="At least 6 characters" />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Creating your account…" : role === "seller" ? "Open my shop 🚀" : "Create my account ✨"}
        </button>
        <p style={{ textAlign: "center", marginTop: 16, fontWeight: 600, color: "var(--ink-soft)" }}>
          Already have an account? <Link to="/login" style={{ color: "var(--primary-dark)", fontWeight: 800 }}>Sign in</Link>
        </p>
      </form>
    </div>
  );
}
