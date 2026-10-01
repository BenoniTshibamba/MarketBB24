import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../api";
import { useAuth } from "../AuthContext";
import { EmptyState, Stars } from "../components/ui";

const ORDER_FLOW = ["placed", "shipped", "delivered"];

export default function SellerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [ps, os, ofs] = await Promise.all([api("/api/seller/products"), api("/api/seller/orders"), api("/api/seller/offers")]);
      setProducts(ps);
      setOrders(os);
      setOffers(ofs);
    } catch {
      setProducts([]);
      setOrders([]);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const del = async (p) => {
    if (!confirm(`Remove "${p.title}" from your shop?`)) return;
    await api(`/api/products/${p.id}`, { method: "DELETE" });
    load();
  };

  const updateStatus = async (orderId, status) => {
    await api(`/api/seller/orders/${orderId}`, { method: "PUT", body: { status } });
    load();
  };

  const handleOffer = async (offerId, action) => {
    if (action === "accept" && !confirm("Accept this offer? The buyer can then purchase at this price.")) return;
    await api(`/api/seller/offers/${offerId}/${action}`, { method: "POST" });
    load();
  };

  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((n, o) => n + o.total, 0);
  const sold = orders.filter((o) => o.status !== "cancelled").reduce((n, o) => n + o.items.length, 0);

  if (loading) return <div className="container page"><div className="empty"><div className="empty-emoji">⏳</div><p>Opening your shop…</p></div></div>;

  return (
    <div className="container page">
      <div className="section-head">
        <div>
          <h2>Welcome to your shop, {user?.name?.split(" ")[0]}! 🏪</h2>
          <p>{user?.seller_type === "company" ? `Selling as ${user?.company_name} 🏢` : "Selling as an independent seller 🙂"} · here's how it's going</p>
        </div>
        <Link to="/seller/new" className="btn btn-primary">+ List a product</Link>
      </div>

      <div className="stat-grid">
        <div className="stat"><div className="stat-num">{money(revenue)}</div><div className="stat-label">💰 Revenue</div></div>
        <div className="stat"><div className="stat-num">{sold}</div><div className="stat-label">📦 Items sold</div></div>
        <div className="stat"><div className="stat-num">{products.length}</div><div className="stat-label">🏷️ Live listings</div></div>
        <div className="stat"><div className="stat-num">{orders.length}</div><div className="stat-label">🧾 Orders</div></div>
      </div>

      <div className="tabs">
        <button className={`chip ${tab === "products" ? "on" : ""}`} onClick={() => setTab("products")}>🏷️ My products ({products.length})</button>
        <button className={`chip ${tab === "orders" ? "on" : ""}`} onClick={() => setTab("orders")}>🧾 Orders ({orders.length})</button>
        <button className={`chip ${tab === "offers" ? "on" : ""}`} onClick={() => setTab("offers")}>🤝 Offers ({offers.filter((o) => o.status === "pending").length})</button>
      </div>

      {tab === "products" && (
        products.length === 0 ? (
          <EmptyState
            emoji="🏷️"
            title="Your shelves are empty"
            text="List your first product and start earning — it takes a minute."
            action={<Link to="/seller/new" className="btn btn-primary">List my first product 🚀</Link>}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th></th><th>Product</th><th>Price</th><th>Stock</th><th>Rating</th><th></th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><img className="mini-img" src={p.image || "https://picsum.photos/seed/nova/600/400"} alt="" /></td>
                    <td><strong>{p.title}</strong><br /><span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{p.category}</span></td>
                    <td><strong>{money(p.price)}</strong></td>
                    <td>{p.stock <= 5 ? <span className="badge badge-low">{p.stock} left</span> : p.stock}</td>
                    <td><Stars value={p.rating} /> <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>({p.reviews_count})</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <Link to={`/seller/edit/${p.id}`} className="btn btn-soft btn-sm">Edit ✏️</Link>{" "}
                      <button className="btn btn-danger-soft btn-sm" onClick={() => del(p)}>Delete 🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "orders" && (
        orders.length === 0 ? (
          <EmptyState emoji="🧾" title="No orders yet" text="When someone buys from you, their order will appear here." action={null} />
        ) : (
          orders.map((o) => (
            <div className="order-card" key={o.id}>
              <div className="order-head">
                <h3>Order #{o.id} <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: "0.9rem" }}>· {o.created_at.slice(0, 10)} · buyer: {o.name}</span></h3>
                <span className="badge badge-status">{o.status.replace("_", " ")}</span>
              </div>
              {o.items.map((i) => (
                <div className="order-item" key={i.id}>
                  <span>{i.title} × {i.qty}</span>
                  <span>{money(i.price * i.qty)}</span>
                </div>
              ))}
              <div className="order-item" style={{ fontWeight: 900, color: "var(--ink)" }}>
                <span>You'll earn</span><span>{money(o.items.reduce((n, i) => n + i.price * i.qty, 0))}</span>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: "0.88rem" }}>Update status:</span>
                {ORDER_FLOW.map((s) => (
                  <button
                    key={s}
                    className={`chip ${o.status === s ? "on" : ""}`}
                    onClick={() => updateStatus(o.id, s)}
                    disabled={o.status === s}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))
        )
      )}

      {tab === "offers" && (
        offers.length === 0 ? (
          <EmptyState emoji="🤝" title="No offers yet" text="When a buyer proposes a price on your products, it'll land here for you to accept or decline." action={null} />
        ) : (
          <div className="offer-list">
            {offers.map((o) => (
              <div className="offer-card" key={o.id}>
                {o.product_image && <img src={o.product_image} alt="" className="offer-thumb" />}
                <div className="offer-main">
                  <Link to={`/product/${o.product_id}`} className="offer-title">{o.product_title}</Link>
                  <div className="offer-prices">
                    <span className="offer-list-price">{money(o.product_price)}</span>
                    <span className="offer-arrow">→</span>
                    <strong className="offer-amount">{money(o.amount)}</strong>
                    <span style={{ color: "var(--muted)", fontSize: "0.82rem", fontWeight: 600 }}>
                      ({Math.round((1 - o.amount / o.product_price) * 100)}% off)
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>
                    from <strong>{o.buyer_name}</strong> · {o.created_at.slice(0, 10)}
                  </div>
                </div>
                {o.status === "pending" ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleOffer(o.id, "accept")}>Accept 🎉</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleOffer(o.id, "decline")}>Decline</button>
                  </div>
                ) : (
                  <span className={`badge ${o.status === "accepted" ? "badge-success" : o.status === "redeemed" ? "badge-info" : "badge-danger"}`}>
                    {o.status === "accepted" ? "🎉 Accepted" : o.status === "redeemed" ? "✅ Purchased" : "🙁 Declined"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
