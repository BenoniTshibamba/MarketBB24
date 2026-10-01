import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../api";
import { useAuth } from "../AuthContext";
import { EmptyState } from "../components/ui";

export default function Cart() {
  const { refreshCart } = useAuth();
  const [cart, setCart] = useState(null);

  const load = () => api("/api/cart").then(setCart).catch(() => setCart({ items: [], total: 0 }));
  useEffect(() => { load(); }, []);

  const updateQty = async (pid, qty) => {
    const c = await api(`/api/cart/${pid}`, { method: "PUT", body: { qty } });
    setCart(c);
    refreshCart();
  };
  const removeItem = async (pid) => {
    const c = await api(`/api/cart/${pid}`, { method: "DELETE" });
    setCart(c);
    refreshCart();
  };

  if (!cart) return <div className="container page"><div className="empty"><div className="empty-emoji">⏳</div><p>Loading your cart…</p></div></div>;

  if (cart.items.length === 0)
    return (
      <div className="container page">
        <EmptyState
          emoji="🛒"
          title="Your cart is feeling a little light"
          text="Let's fix that — beautiful things are waiting for you."
          action={<Link to="/" className="btn btn-primary">Discover treasures 🛍️</Link>}
        />
      </div>
    );

  return (
    <div className="container page">
      <div className="section-head">
        <div>
          <h2>Your cart 🛒</h2>
          <p>{cart.items.length} item{cart.items.length === 1 ? "" : "s"} · great taste, by the way</p>
        </div>
      </div>
      <div className="cart-layout">
        <div>
          {cart.items.map((i) => (
            <div className="cart-item" key={i.product_id}>
              <Link to={`/product/${i.product_id}`}>
                <img src={i.image || "https://picsum.photos/seed/nova/600/400"} alt={i.title} />
              </Link>
              <div className="cart-item-info">
                <h4><Link to={`/product/${i.product_id}`}>{i.title}</Link></h4>
                <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>Sold by {i.seller_name}</div>
                <div className="qty-ctrl" style={{ marginTop: 8, display: "inline-flex" }}>
                  <button onClick={() => i.qty > 1 ? updateQty(i.product_id, i.qty - 1) : removeItem(i.product_id)}>−</button>
                  <span>{i.qty}</span>
                  <button onClick={() => updateQty(i.product_id, Math.min(99, i.qty + 1))}>+</button>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="price">{money(i.price * i.qty)}</div>
                <button
                  onClick={() => removeItem(i.product_id)}
                  style={{ background: "none", border: "none", color: "var(--red)", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", marginTop: 6 }}
                >
                  Remove 🗑️
                </button>
              </div>
            </div>
          ))}
          <Link to="/" style={{ fontWeight: 800, color: "var(--primary-dark)" }}>← Keep browsing</Link>
        </div>
        <div className="summary">
          <h3>Order summary 🧾</h3>
          <div className="summary-row"><span>Subtotal</span><span>{money(cart.total)}</span></div>
          <div className="summary-row"><span>Shipping</span><span style={{ color: "var(--green)", fontWeight: 800 }}>FREE 🎉</span></div>
          <div className="summary-row total"><span>Total</span><span>{money(cart.total)}</span></div>
          <Link to="/checkout" className="btn btn-primary btn-block" style={{ marginTop: 14 }}>
            Go to checkout 💳
          </Link>
          <div className="form-hint" style={{ textAlign: "center", marginTop: 10 }}>🔒 Secure payment powered by Stripe</div>
        </div>
      </div>
    </div>
  );
}
