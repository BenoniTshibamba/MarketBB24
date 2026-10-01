import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, money } from "../api";
import { useAuth } from "../AuthContext";
import { EmptyState } from "../components/ui";

const METHODS = [
  { id: "card", emoji: "💳", label: "Card", hint: "Visa, Mastercard, Amex" },
  { id: "paypal", emoji: "🅿️", label: "PayPal", hint: "Your PayPal account" },
  { id: "applepay", emoji: "🍎", label: "Apple Pay", hint: "Face ID / Touch ID" },
];

const fmtCard = (v) =>
  v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
const fmtExp = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return d.slice(0, 2) + "/" + d.slice(2);
};

export default function Checkout() {
  const nav = useNavigate();
  const { refreshCart } = useAuth();
  const [params] = useSearchParams();
  const cancelled = params.get("cancelled") === "1";
  const offerId = params.get("offer");

  const [cart, setCart] = useState(null);
  const [offer, setOffer] = useState(null);
  const [offerChecked, setOfferChecked] = useState(!offerId);
  const [stripeLive, setStripeLive] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "", postal: "", country: "Canada" });
  const [method, setMethod] = useState("card");
  const [card, setCard] = useState({ number: "4242 4242 4242 4242", expiry: "12/28", cvc: "123", holder: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/health").then((h) => setStripeLive(!!h.stripe)).catch(() => {});
    if (offerId) {
      api("/api/offers/mine")
        .then((offers) => {
          const o = offers.find((x) => String(x.id) === String(offerId));
          if (!o || o.status !== "accepted") nav("/profile");
          else setOffer(o);
        })
        .catch(() => nav("/profile"))
        .finally(() => setOfferChecked(true));
    } else {
      api("/api/cart").then(setCart).catch(() => nav("/cart"));
    }
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const total = offer ? offer.amount : cart?.total || 0;
  const items = offer
    ? [{ title: offer.product_title, qty: 1, price: offer.amount }]
    : cart?.items || [];

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!stripeLive && method === "card") {
      if (card.number.replace(/\s/g, "").length !== 16) {
        setError("That card number looks short — 16 digits, please 🙂");
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) {
        setError("Expiry should look like MM/YY 🙂");
        return;
      }
      if (!/^\d{3,4}$/.test(card.cvc)) {
        setError("CVC is the 3 digits on the back of your card 🙂");
        return;
      }
    }
    setBusy(true);
    try {
      const payload = { ...form, payment_method: method };
      const url = offer ? `/api/offers/${offer.id}/redeem` : "/api/orders/checkout";
      const res = await api(url, { method: "POST", body: payload });
      await refreshCart();
      if (res.stripe && res.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        nav(`/order-success?order_id=${res.order.id}&demo=1`);
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (!offerChecked || (!offer && !cart))
    return <div className="container page"><div className="empty"><div className="empty-emoji">⏳</div><p>Preparing checkout…</p></div></div>;
  if (!offer && cart.items.length === 0)
    return (
      <div className="container page">
        <EmptyState emoji="🛒" title="Nothing to check out" text="Your cart is empty — let's find something wonderful." action={<Link to="/" className="btn btn-primary">Browse the market</Link>} />
      </div>
    );

  const methodLabel = METHODS.find((m) => m.id === method)?.label;

  return (
    <div className="container page">
      <div className="section-head">
        <div>
          <h2>{offer ? "Your offer was accepted! 🎉" : "Almost yours! 💳"}</h2>
          <p>{offer ? `The seller said yes to ${money(offer.amount)} — seal the deal` : "Just a few details and it's on its way"}</p>
        </div>
      </div>
      {cancelled && (
        <div className="alert-info">
          No worries — the payment was cancelled and nothing was charged. Your cart is still here whenever you're ready. 💛
        </div>
      )}
      <div className="cart-layout">
        <form className="form-card wide" style={{ margin: 0 }} onSubmit={submit}>
          <h2>Where's it going? 📬</h2>
          <p className="form-sub">We'll take good care of your order.</p>
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <label>Full name</label>
            <input value={form.name} onChange={set("name")} required placeholder="Jane Doe" />
          </div>
          <div className="field">
            <label>Street address</label>
            <input value={form.address} onChange={set("address")} required placeholder="123 Maple Street, Apt 4" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>City</label>
              <input value={form.city} onChange={set("city")} required placeholder="Montreal" />
            </div>
            <div className="field">
              <label>Postal code</label>
              <input value={form.postal} onChange={set("postal")} required placeholder="H2X 1Y2" />
            </div>
          </div>
          <div className="field">
            <label>Country</label>
            <input value={form.country} onChange={set("country")} required />
          </div>

          <h2 style={{ marginTop: 26 }}>How do you want to pay? 💸</h2>
          <p className="form-sub">Pick whatever suits you.</p>
          <div className="role-pick pay-pick">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`role-card ${method === m.id ? "active" : ""}`}
                onClick={() => setMethod(m.id)}
              >
                <span className="role-emoji">{m.emoji}</span>
                <strong>{m.label}</strong>
                <small>{m.hint}</small>
              </button>
            ))}
          </div>

          {method === "card" && !stripeLive && (
            <div className="pay-panel">
              <div className="demo-badge">🧪 Demo mode — no real charge</div>
              <div className="field">
                <label>Card number</label>
                <input
                  value={card.number}
                  onChange={(e) => setCard({ ...card, number: fmtCard(e.target.value) })}
                  inputMode="numeric"
                  placeholder="4242 4242 4242 4242"
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Expiry</label>
                  <input
                    value={card.expiry}
                    onChange={(e) => setCard({ ...card, expiry: fmtExp(e.target.value) })}
                    inputMode="numeric"
                    placeholder="MM/YY"
                  />
                </div>
                <div className="field">
                  <label>CVC</label>
                  <input
                    value={card.cvc}
                    onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                    inputMode="numeric"
                    placeholder="123"
                  />
                </div>
              </div>
              <div className="field">
                <label>Name on card</label>
                <input value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value })} placeholder="Jane Doe" />
              </div>
            </div>
          )}

          {method === "paypal" && !stripeLive && (
            <div className="pay-panel">
              <div className="demo-badge">🧪 Demo mode — no real charge</div>
              <button type="submit" className="paypal-btn" disabled={busy}>
                <em>Pay</em>Pal
              </button>
              <p className="form-sub" style={{ textAlign: "center", margin: "10px 0 0" }}>
                You'll log in to PayPal to approve {money(total)} — simulated for now.
              </p>
            </div>
          )}

          {method === "applepay" && !stripeLive && (
            <div className="pay-panel">
              <div className="demo-badge">🧪 Demo mode — no real charge</div>
              <button type="submit" className="applepay-btn" disabled={busy}>
                 Pay
              </button>
              <p className="form-sub" style={{ textAlign: "center", margin: "10px 0 0" }}>
                Confirm with Face ID / Touch ID — simulated for now.
              </p>
            </div>
          )}

          {stripeLive ? (
            <div className="secure-note">🔒 You'll pay on Stripe's secure page — cards, Apple Pay & Google Pay accepted. We never see or store your card.</div>
          ) : (
            <div className="secure-note">💡 Connect your Stripe key in <code>backend/.env</code> to accept real payments — then this page hands off to Stripe's secure checkout automatically.</div>
          )}

          {!(method !== "card" && !stripeLive) && (
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "Preparing your payment…" : stripeLive ? `Continue to secure payment · ${money(total)} 🔒` : `Pay ${money(total)} with ${methodLabel} 💳`}
            </button>
          )}
        </form>
        <div className="summary">
          <h3>Your items 🎁</h3>
          {items.map((i, idx) => (
            <div className="summary-row" key={idx}>
              <span>{i.title} × {i.qty}</span>
              <span>{money(i.price * i.qty)}</span>
            </div>
          ))}
          {offer && (
            <div className="summary-row"><span>Offer discount 🎉</span><span style={{ color: "var(--green)", fontWeight: 800 }}>−{money(offer.product_price - offer.amount)}</span></div>
          )}
          <div className="summary-row"><span>Shipping</span><span style={{ color: "var(--green)", fontWeight: 800 }}>FREE 🎉</span></div>
          <div className="summary-row total"><span>Total</span><span>{money(total)}</span></div>
        </div>
      </div>
    </div>
  );
}
