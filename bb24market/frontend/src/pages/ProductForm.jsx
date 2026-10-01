import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

const CATS = ["Electronics", "Fashion", "Home & Kitchen", "Beauty", "Sports", "Books", "Toys", "General"];

export default function ProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", price: "", category: "General",
    stock: "10", image: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing) {
      api(`/api/products/${id}`)
        .then((p) => setForm({
          title: p.title, description: p.description || "",
          price: String(p.price), category: p.category,
          stock: String(p.stock), image: p.image || "",
        }))
        .catch(() => nav("/seller"));
    }
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const payload = {
      title: form.title,
      description: form.description,
      price: Number(form.price),
      category: form.category,
      stock: Number(form.stock),
      image: form.image || null,
    };
    try {
      if (editing) {
        await api(`/api/products/${id}`, { method: "PUT", body: payload });
      } else {
        await api("/api/products", { method: "POST", body: payload });
      }
      nav("/seller");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <form className="form-card wide" onSubmit={submit}>
        <h2>{editing ? "Edit your listing ✏️" : "List a new product 🚀"}</h2>
        <p className="form-sub">{editing ? "Make it even better." : "Tell the world what you're selling."}</p>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label>Title</label>
          <input value={form.title} onChange={set("title")} required placeholder="e.g. Handmade Ceramic Mug" />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={form.description} onChange={set("description")} placeholder="What makes it special? Materials, size, story…" />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Price (USD)</label>
            <input type="number" step="0.01" min="0.01" value={form.price} onChange={set("price")} required placeholder="29.99" />
          </div>
          <div className="field">
            <label>Stock</label>
            <input type="number" min="0" value={form.stock} onChange={set("stock")} required />
          </div>
        </div>
        <div className="field">
          <label>Category</label>
          <select value={form.category} onChange={set("category")}>
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Photo URL (optional)</label>
          <input value={form.image} onChange={set("image")} placeholder="https://…" />
          <div className="form-hint">Paste a link to a photo of your product. Leave empty for a pretty placeholder.</div>
        </div>
        {form.image && (
          <div className="field">
            <img src={form.image} alt="preview" style={{ maxWidth: 220, borderRadius: 12 }} onError={(e) => (e.target.style.display = "none")} />
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={() => nav("/seller")}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes 💾" : "Publish my product 🎉"}
          </button>
        </div>
      </form>
    </div>
  );
}
