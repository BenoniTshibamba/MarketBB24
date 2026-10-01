import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, money } from "../api";
import { useAuth } from "../AuthContext";
import { EmptyState, SellerBadge, Stars, StockBadge } from "../components/ui";

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, refreshCart } = useAuth();
  const [p, setP] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [showOffer, setShowOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMsg, setOfferMsg] = useState("");
  const [offerBusy, setOfferBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api(`/api/products/${id}`)
      .then(setP)
      .catch(() => setP(null))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const addToCart = async () => {
    if (!user) return nav("/login");
    setAdding(true);
    try {
      await api("/api/cart", { method: "POST", body: { product_id: p.id, qty } });
      await refreshCart();
      setAdded(true);
      setTimeout(() => setAdded(false), 2200);
    } catch (e) {
      alert(e.message);
    } finally {
      setAdding(false);
    }
  };

  const sendOffer = async (e) => {
    e.preventDefault();
    if (!user) return nav("/login");
    setOfferMsg("");
    const amount = parseFloat(offerAmount);
    if (!amount || amount <= 0) {
      setOfferMsg("Enter an amount above $0 🙂");
      return;
    }
    setOfferBusy(true);
    try {
      await api(`/api/products/${p.id}/offers`, { method: "POST", body: { amount } });
      setOfferMsg("sent");
      setOfferAmount("");
    } catch (err) {
      setOfferMsg(err.message);
    } finally {
      setOfferBusy(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setReviewMsg("");
    try {
      await api(`/api/products/${p.id}/reviews`, {
        method: "POST",
        body: { rating, comment },
      });
      setComment("");
      setReviewMsg("Thanks for sharing your thoughts! 💛");
      load();
    } catch (err) {
      setReviewMsg(err.message);
    }
  };

  if (loading) return <div className="container page"><div className="empty"><div className="empty-emoji">⏳</div><p>Loading…</p></div></div>;
  if (!p)
    return (
      <div className="container page">
        <EmptyState emoji="🕵️" title="Hmm, can't find that product" text="It may have been sold or removed." action={<Link to="/" className="btn btn-primary">Back to the market</Link>} />
      </div>
    );

  return (
    <div className="container page">
      <Link to="/" style={{ fontWeight: 800, color: "var(--primary-dark)" }}>← Back to browsing</Link>
      <div className="detail" style={{ marginTop: 18 }}>
        <div>
          <img className="detail-img" src={p.image || "https://picsum.photos/seed/nova/600/400"} alt={p.title} />
        </div>
        <div className="detail-info">
          <span className="card-cat">{p.category}</span>
          <h1>{p.title}</h1>
          <div className="rating-line">
            <Stars value={p.rating} size="1.05rem" />
            <span>{p.rating > 0 ? `${p.rating.toFixed(1)} · ${p.reviews_count} review${p.reviews_count === 1 ? "" : "s"}` : "No reviews yet — be the first! ✨"}</span>
          </div>
          <div className="detail-price">{money(p.price)} <small>· free returns within 30 days</small></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <StockBadge stock={p.stock} />
            <SellerBadge sellerType={p.seller_type} companyName={p.company_name} />
          </div>

          <div className="seller-card">
            <div className="seller-avatar">{(p.seller_name || "?")[0].toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 800 }}>Sold by {p.seller_name}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>
                {p.seller_type === "company" ? "Verified company 🏪" : "Independent seller 🙂"} · ships in 1–2 days
              </div>
            </div>
          </div>

          <div className="qty-row">
            <div className="qty-ctrl">
              <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <span>{qty}</span>
              <button onClick={() => setQty(Math.min(p.stock || 1, qty + 1))}>+</button>
            </div>
            <button className="btn btn-primary" disabled={adding || p.stock <= 0} onClick={addToCart}>
              {added ? "Added! 🎉" : adding ? "Adding…" : "🛒 Add to cart"}
            </button>
            {user && user.id !== p.seller_id && p.stock > 0 && (
              <button className="btn btn-offer" onClick={() => { setShowOffer(true); setOfferMsg(""); }}>
                🤝 Make an offer
              </button>
            )}
          </div>
          {added && <div className="alert-info">Nice pick! It's waiting in <Link to="/cart" style={{ textDecoration: "underline" }}>your cart</Link>. 💛</div>}
          {showOffer && (
            <div className="offer-dialog">
              <h3 style={{ margin: "0 0 6px" }}>Make an offer 🤝</h3>
              <p className="form-sub" style={{ margin: "0 0 12px" }}>
                Listed at <strong>{money(p.price)}</strong> — what would you happily pay? The seller can accept or decline.
              </p>
              {offerMsg === "sent" ? (
                <div className="alert-info">
                  🎉 Offer sent! The seller will reply soon — track it under <Link to="/profile" style={{ textDecoration: "underline" }}>My offers</Link>.
                </div>
              ) : (
                <form onSubmit={sendOffer} className="offer-form">
                  <div className="offer-input-wrap">
                    <span>$</span>
                    <input
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      inputMode="decimal"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                  <button className="btn btn-primary" disabled={offerBusy}>
                    {offerBusy ? "Sending…" : "Send offer 💌"}
                  </button>
                </form>
              )}
              {offerMsg && offerMsg !== "sent" && <div className="form-error">{offerMsg}</div>}
              {offerMsg !== "sent" && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setShowOffer(false)}>
                  Never mind
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="detail-desc" style={{ marginTop: 26 }}>
        <h3 style={{ marginTop: 0 }}>About this item 📝</h3>
        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{p.description || "No description yet — but it looks great, doesn't it?"}</p>
      </div>

      <div className="section-head" style={{ marginTop: 34 }}>
        <h2>What buyers say 💬</h2>
      </div>
      {p.reviews.length === 0 && <p style={{ color: "var(--muted)", fontWeight: 600 }}>No reviews yet. Bought it? Tell the world!</p>}
      {p.reviews.map((r) => (
        <div className="review" key={r.id}>
          <div className="review-head">
            <Stars value={r.rating} />
            <span className="review-name">{r.user_name}</span>
            <span className="review-date">{r.created_at.slice(0, 10)}</span>
          </div>
          <div>{r.comment}</div>
        </div>
      ))}

      {user && (
        <form className="review-form" onSubmit={submitReview}>
          <h3 style={{ marginTop: 0 }}>Share your experience ✨</h3>
          <div className="field">
            <label>Your rating</label>
            <div className="star-input">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={i <= rating ? "" : "off"} onClick={() => setRating(i)}>★</span>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Your review</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did you love about it?" />
          </div>
          {reviewMsg && <div className="form-error" style={{ background: "var(--green-soft)", color: "var(--green)" }}>{reviewMsg}</div>}
          <button className="btn btn-primary" type="submit">Post review 💛</button>
          <div className="form-hint">Only buyers who purchased this item can review it.</div>
        </form>
      )}
    </div>
  );
}
