import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, money } from "../api";
import { useAuth } from "../AuthContext";
import { EmptyState } from "../components/ui";

const OFFER_STATUS = {
  pending: { label: "Waiting on seller", cls: "badge-pending", emoji: "⏳" },
  accepted: { label: "Accepted!", cls: "badge-success", emoji: "🎉" },
  declined: { label: "Declined", cls: "badge-danger", emoji: "🙁" },
  redeemed: { label: "Purchased", cls: "badge-info", emoji: "✅" },
};

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const nav = useNavigate();
  const [orders, setOrders] = useState([]);
  const [offers, setOffers] = useState([]);
  const [sellerStats, setSellerStats] = useState(null);
  const [form, setForm] = useState({ name: "", role: "buyer", seller_type: "individual", company_name: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name,
      role: user.role,
      seller_type: user.seller_type || "individual",
      company_name: user.company_name || "",
    });
    api("/api/orders").then(setOrders).catch(() => {});
    api("/api/offers/mine").then(setOffers).catch(() => {});
    if (user.role === "seller") {
      Promise.all([api("/api/seller/products"), api("/api/seller/orders")])
        .then(([ps, os]) => {
          const revenue = os.filter((o) => o.status !== "cancelled").reduce((n, o) => n + o.total, 0);
          setSellerStats({ listings: ps.length, revenue, sales: os.length });
        })
        .catch(() => {});
    }
  }, [user?.id]);

  if (!user) return null;

  const spent = orders.filter((o) => o.status !== "cancelled").reduce((n, o) => n + o.total, 0);

  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role,
        seller_type: form.role === "seller" ? form.seller_type : null,
        company_name: form.role === "seller" && form.seller_type === "company" ? form.company_name.trim() : null,
      };
      const updated = await api("/api/users/me", { method: "PATCH", body: payload });
      await refreshUser();
      setMsg(
        updated.role === "seller"
          ? "You're a seller now — happy selling! 🏪"
          : "Profile updated! 💚"
      );
      if (updated.role === "seller") {
        const [ps, os] = await Promise.all([api("/api/seller/products"), api("/api/seller/orders")]);
        const revenue = os.filter((o) => o.status !== "cancelled").reduce((n, o) => n + o.total, 0);
        setSellerStats({ listings: ps.length, revenue, sales: os.length });
      } else {
        setSellerStats(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const pendingOffers = offers.filter((o) => o.status === "pending" || o.status === "accepted");

  return (
    <div className="container page">
      <div className="section-head">
        <div>
          <h2>My profile 👤</h2>
          <p>Everything about you, in one place</p>
        </div>
      </div>

      {msg && <div className="alert-info">🎉 {msg}</div>}
      {error && <div className="form-error">{error}</div>}

      <div className="profile-grid">
        {/* identity card */}
        <div className="form-card" style={{ margin: 0 }}>
          <div className="profile-id">
            <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div>
              <h3 style={{ margin: "0 0 4px" }}>{user.name}</h3>
              <div style={{ color: "var(--muted)", fontWeight: 600 }}>{user.email}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className={`badge ${user.role === "seller" ? "badge-seller" : "badge-buyer"}`}>
                  {user.role === "seller" ? "🏪 Seller" : "🛍️ Buyer"}
                </span>
                {user.role === "seller" && (
                  <span className="badge badge-info">
                    {user.seller_type === "company" ? `🏢 ${user.company_name}` : "🙂 Individual"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="stat-grid" style={{ marginTop: 18 }}>
            <div className="stat"><div className="stat-num">{orders.length}</div><div className="stat-label">📦 Orders</div></div>
            <div className="stat"><div className="stat-num">{money(spent)}</div><div className="stat-label">💰 Total spent</div></div>
            {sellerStats && (
              <>
                <div className="stat"><div className="stat-num">{sellerStats.listings}</div><div className="stat-label">🏷️ Listings</div></div>
                <div className="stat"><div className="stat-num">{money(sellerStats.revenue)}</div><div className="stat-label">💵 Revenue</div></div>
              </>
            )}
          </div>
          {user.role === "seller" && (
            <Link to="/seller" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
              Open my shop 🏪
            </Link>
          )}
        </div>

        {/* edit form */}
        <form className="form-card" style={{ margin: 0 }} onSubmit={save}>
          <h2 style={{ marginTop: 0 }}>Edit my info ✏️</h2>
          <p className="form-sub">Switch between buying and selling whenever you like.</p>
          <div className="field">
            <label>Display name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
          </div>
          <div className="field">
            <label>I want to…</label>
            <div className="role-pick">
              <button
                type="button"
                className={`role-card ${form.role === "buyer" ? "active" : ""}`}
                onClick={() => setForm({ ...form, role: "buyer" })}
              >
                <span className="role-emoji">🛍️</span>
                <strong>Buy</strong>
                <small>Shop the marketplace</small>
              </button>
              <button
                type="button"
                className={`role-card ${form.role === "seller" ? "active" : ""}`}
                onClick={() => setForm({ ...form, role: "seller" })}
              >
                <span className="role-emoji">🏪</span>
                <strong>Sell</strong>
                <small>Open your own shop</small>
              </button>
            </div>
          </div>
          {form.role === "seller" && (
            <>
              <div className="field">
                <label>Selling as</label>
                <div className="role-pick">
                  <button
                    type="button"
                    className={`role-card ${form.seller_type === "individual" ? "active" : ""}`}
                    onClick={() => setForm({ ...form, seller_type: "individual" })}
                  >
                    <span className="role-emoji">🙂</span>
                    <strong>Individual</strong>
                    <small>Just me</small>
                  </button>
                  <button
                    type="button"
                    className={`role-card ${form.seller_type === "company" ? "active" : ""}`}
                    onClick={() => setForm({ ...form, seller_type: "company" })}
                  >
                    <span className="role-emoji">🏢</span>
                    <strong>Company</strong>
                    <small>My business</small>
                  </button>
                </div>
              </div>
              {form.seller_type === "company" && (
                <div className="field">
                  <label>Company name</label>
                  <input
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    placeholder="Acme Inc."
                  />
                </div>
              )}
            </>
          )}
          <button className="btn btn-primary btn-block" disabled={saving}>
            {saving ? "Saving…" : "Save changes 💾"}
          </button>
        </form>
      </div>

      {/* my offers */}
      <div className="section-head" style={{ marginTop: 34 }}>
        <div>
          <h2>My offers 🤝</h2>
          <p>Price proposals you've made to sellers</p>
        </div>
      </div>
      {offers.length === 0 ? (
        <EmptyState
          emoji="🤝"
          title="No offers yet"
          text="See something you love? Hit “Make an offer” on any product and haggle like a friend."
          action={<Link to="/" className="btn btn-primary">Browse the market</Link>}
        />
      ) : (
        <div className="offer-list">
          {offers.map((o) => {
            const st = OFFER_STATUS[o.status] || OFFER_STATUS.pending;
            return (
              <div className="offer-card" key={o.id}>
                {o.product_image && <img src={o.product_image} alt="" className="offer-thumb" />}
                <div className="offer-main">
                  <Link to={`/product/${o.product_id}`} className="offer-title">{o.product_title}</Link>
                  <div className="offer-prices">
                    <span className="offer-list-price">{money(o.product_price)}</span>
                    <span className="offer-arrow">→</span>
                    <strong className="offer-amount">{money(o.amount)}</strong>
                  </div>
                  <span className={`badge ${st.cls}`}>{st.emoji} {st.label}</span>
                </div>
                {o.status === "accepted" && (
                  <button className="btn btn-primary btn-sm" onClick={() => nav(`/checkout?offer=${o.id}`)}>
                    Buy at {money(o.amount)} 🎉
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {pendingOffers.length > 0 && (
        <p style={{ color: "var(--muted)", fontWeight: 600, marginTop: 12 }}>
          💡 {pendingOffers.length} offer{pendingOffers.length > 1 ? "s are" : " is"} still in play — sellers usually reply within a day.
        </p>
      )}
    </div>
  );
}
