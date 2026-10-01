import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../api";
import { EmptyState, Stars } from "../components/ui";

const STEPS = ["placed", "shipped", "delivered"];

export default function Orders() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    api("/api/orders").then(setOrders).catch(() => setOrders([]));
  }, []);

  if (!orders) return <div className="container page"><div className="empty"><div className="empty-emoji">⏳</div><p>Loading your orders…</p></div></div>;
  if (orders.length === 0)
    return (
      <div className="container page">
        <EmptyState
          emoji="📦"
          title="No orders yet"
          text="When you buy something lovely, it'll show up right here."
          action={<Link to="/" className="btn btn-primary">Start shopping 🛍️</Link>}
        />
      </div>
    );

  return (
    <div className="container page">
      <div className="section-head">
        <div>
          <h2>Your orders 📦</h2>
          <p>{orders.length} order{orders.length === 1 ? "" : "s"} · thanks for shopping with us!</p>
        </div>
      </div>
      {orders.map((o) => {
        const stepIdx = o.status === "cancelled" ? -1 : STEPS.indexOf(o.status);
        return (
          <div className="order-card" key={o.id}>
            <div className="order-head">
              <h3>Order #{o.id} <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: "0.9rem" }}>· {o.created_at.slice(0, 10)}</span></h3>
              <span className="badge badge-status">{o.status.replace("_", " ")}</span>
            </div>
            {o.status !== "cancelled" && (
              <div className="status-steps">
                {STEPS.map((s, i) => (
                  <span key={s} className={`step ${i <= stepIdx ? "done" : ""}`}>
                    {i <= stepIdx ? "✓ " : ""}{s}
                  </span>
                ))}
              </div>
            )}
            {o.items.map((i) => (
              <div className="order-item" key={i.id}>
                <span><Link to={`/product/${i.product_id}`} style={{ textDecoration: "underline" }}>{i.title}</Link> × {i.qty}</span>
                <span>{money(i.price * i.qty)}</span>
              </div>
            ))}
            <div className="order-item" style={{ fontWeight: 900, color: "var(--ink)" }}>
              <span>Total</span><span>{money(o.total)}</span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600, marginTop: 6 }}>
              🚚 Shipping to {o.name}, {o.address}, {o.city} {o.postal}
            </div>
          </div>
        );
      })}
    </div>
  );
}
