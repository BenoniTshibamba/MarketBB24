import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, money } from "../api";
import { EmptyState } from "../components/ui";

export default function OrderSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const orderId = params.get("order_id");
  const demo = params.get("demo") === "1";
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (demo && orderId) {
      api(`/api/orders`).then((os) => {
        const o = os.find((x) => x.id === Number(orderId));
        if (o) setOrder(o);
        else setError("We couldn't find that order — but don't worry, check your orders page.");
      }).catch(() => setError("We couldn't load your order just now."));
    } else if (sessionId) {
      api("/api/payments/confirm", { method: "POST", body: { session_id: sessionId } })
        .then((res) => setOrder(res.order))
        .catch((e) => setError(e.message));
    } else {
      setError("Hmm, this page needs a payment session to show your order.");
    }
  }, []);

  if (error)
    return (
      <div className="container page">
        <EmptyState emoji="😅" title="Oops, something hiccuped" text={error} action={<Link to="/orders" className="btn btn-primary">Check my orders</Link>} />
      </div>
    );
  if (!order)
    return <div className="container page"><div className="empty"><div className="empty-emoji">⏳</div><p>Confirming your payment…</p></div></div>;

  return (
    <div className="container page">
      <div className="success-hero">
        <div className="success-check">✓</div>
        <h1 style={{ margin: "0 0 8px" }}>Yay! Order confirmed 🎉</h1>
        <p style={{ color: "var(--ink-soft)", fontWeight: 600, fontSize: "1.05rem" }}>
          Thanks, {order.name}! Your goodies are being packed with care.<br />
          A confirmation is on its way — here's what you got:
        </p>
      </div>
      <div className="order-card" style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="order-head">
          <h3>Order #{order.id}</h3>
          <span className="badge badge-status">{order.status.replace("_", " ")}</span>
        </div>
        {order.items.map((i) => (
          <div className="order-item" key={i.id}>
            <span>{i.title} × {i.qty}</span>
            <span>{money(i.price * i.qty)}</span>
          </div>
        ))}
        <div className="order-item" style={{ fontWeight: 900, color: "var(--ink)", fontSize: "1.1rem" }}>
          <span>Total paid</span>
          <span>{money(order.total)}</span>
        </div>
        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link to="/orders" className="btn btn-primary">Track my orders 📦</Link>
          <Link to="/" className="btn btn-ghost">Keep shopping 🛍️</Link>
        </div>
      </div>
    </div>
  );
}
