import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../AuthContext";

export function Stars({ value, size }) {
  const full = Math.round(value || 0);
  return (
    <span className="stars" style={size ? { fontSize: size } : undefined}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= full ? "" : "off"}>★</span>
      ))}
    </span>
  );
}

export function SellerBadge({ sellerType, companyName }) {
  if (sellerType === "company")
    return <span className="badge badge-company">🏪 {companyName || "Company"}</span>;
  if (sellerType === "individual")
    return <span className="badge badge-individual">🙂 Independent seller</span>;
  return null;
}

export function StockBadge({ stock }) {
  if (stock <= 0) return <span className="badge badge-out">Out of stock</span>;
  if (stock <= 5) return <span className="badge badge-low">Only {stock} left!</span>;
  return <span className="badge badge-stock">In stock</span>;
}

export function ProductCard({ p }) {
  return (
    <div className="card">
      <Link to={`/product/${p.id}`}>
        <img
          className="card-img"
          src={p.image || "https://picsum.photos/seed/nova/600/400"}
          alt={p.title}
          loading="lazy"
        />
      </Link>
      <div className="card-body">
        <span className="card-cat">{p.category}</span>
        <Link to={`/product/${p.id}`} className="card-title">{p.title}</Link>
        <div className="rating-line">
          <Stars value={p.rating} />
          <span>{p.rating > 0 ? p.rating.toFixed(1) : "New"} {p.reviews_count > 0 && `(${p.reviews_count})`}</span>
        </div>
        <div className="card-seller">Sold by {p.seller_name}</div>
        <div className="card-foot">
          <span className="price">${Number(p.price).toFixed(2)}</span>
          <Link to={`/product/${p.id}`} className="btn btn-soft btn-sm">View 👀</Link>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ emoji, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-emoji">{emoji}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Header() {
  const { user, logout, cartCount } = useAuth();
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");
  const nav = useNavigate();

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("bb24market_theme", next); } catch {}
  };

  const submit = (e) => {
    e.preventDefault();
    nav(q.trim() ? `/?search=${encodeURIComponent(q.trim())}` : "/");
  };

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          <span className="logo-mark">BB24</span>
          <span>BB24Market<small>BUY & SELL</small></span>
        </Link>
        <form className="searchbar" onSubmit={submit}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for something you'll love… 🔍"
          />
          <button type="submit">Search</button>
        </form>
        <nav className="nav-links">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            aria-label="Toggle dark mode"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          {user?.role === "seller" && (
            <NavLink to="/seller" className="nav-link">My shop 🏪</NavLink>
          )}
          {user && user.role !== "seller" && (
            <NavLink to="/orders" className="nav-link">Orders 📦</NavLink>
          )}
          <NavLink to="/cart" className="nav-link cart-bubble">
            🛒 Cart
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </NavLink>
          {user ? (
            <>
              <Link to="/profile" className="nav-link" title="My profile">
                Hi, {user.name.split(" ")[0]} 👋
              </Link>
              <button
                className="nav-link"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.92rem" }}
                onClick={() => { logout(); nav("/"); }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="nav-link">Sign in</NavLink>
              <NavLink to="/register" className="nav-link active">Join free ✨</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <strong style={{ color: "#fafaf9" }}>BB24Market</strong> — a friendly place to buy and sell anything. 💛
          <div style={{ marginTop: 6, fontSize: "0.78rem", letterSpacing: "1.5px", fontWeight: 800, opacity: 0.75 }}>
            BUILT WITH LOVE AND CAFFEINE BY BB24 ☕
          </div>
        </div>
        <div>Made with care · Payments secured by Stripe</div>
      </div>
    </footer>
  );
}
