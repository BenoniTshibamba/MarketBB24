import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { EmptyState, ProductCard } from "../components/ui";

const SORTS = [
  ["new", "✨ Newest"],
  ["price_asc", "💰 Price: low to high"],
  ["price_desc", "💎 Price: high to low"],
  ["rating", "⭐ Top rated"],
];

export default function Home() {
  const [params] = useSearchParams();
  const search = params.get("search") || "";
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("new");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/categories").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ search, category, sort }).toString();
    api(`/api/products?${qs}`)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [search, category, sort]);

  return (
    <>
      <div className="hero">
        <div className="container">
          <h1>Find something you'll love 💛</h1>
          <p>Shop unique finds from independent sellers and trusted companies — or open your own shop in minutes.</p>
          <div className="hero-cta">
            <Link to="/register" className="btn btn-dark">Start selling — it's free 🚀</Link>
            <a href="#products" className="btn btn-ghost">Browse the market 🛍️</a>
          </div>
        </div>
      </div>

      <div className="container page" id="products" style={{ paddingTop: 0 }}>
        {search && (
          <div className="alert-info">
            Showing results for “<strong>{search}</strong>” <Link to="/" style={{ textDecoration: "underline" }}>clear ✕</Link>
          </div>
        )}

        <div className="filters">
          <div className="chip-row">
            <button className={`chip ${category === "" ? "on" : ""}`} onClick={() => setCategory("")}>
              🌍 All
            </button>
            {categories.filter((c) => c !== "General").map((c) => (
              <button key={c} className={`chip ${category === c ? "on" : ""}`} onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ marginLeft: "auto" }}>
            {SORTS.map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="empty"><div className="empty-emoji">⏳</div><p>Loading lovely things…</p></div>
        ) : products.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title="Nothing found (yet!)"
            text="Try a different search, or be the first to sell it here."
            action={<Link to="/register" className="btn btn-primary">Become a seller 🚀</Link>}
          />
        ) : (
          <>
            <div className="section-head">
              <div>
                <h2>{category || "Everything"} {search && `· “${search}”`}</h2>
                <p>{products.length} treasure{products.length === 1 ? "" : "s"} waiting for you</p>
              </div>
            </div>
            <div className="grid">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
