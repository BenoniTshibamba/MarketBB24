#  BB24Market

**A friendly marketplace where anyone can buy and sell — like Amazon, but warmer.**

Shop unique finds from independent sellers and trusted companies, or open your own shop in minutes. Built with **Python (FastAPI)** + **React (Vite)**.

##  Features

**For buyers**
- Browse, search, filter by category, and sort products
- Product pages with photos, ratings, and verified-purchase reviews
- Persistent cart, friendly checkout, order tracking
- Secure payments via **Stripe Checkout**

**For sellers**
- Register as an **individual** or a **company**
- Beautiful dashboard: revenue, items sold, listings, orders
- List / edit / delete products in seconds
- Update order status (placed → shipped → delivered)

##  Quick start

### Option 1 — one command (Mac/Linux)
```bash
./start.sh
```

### Option 2 — one command (Windows)
Double-click **`start.bat`**, or run it from a terminal.

### Option 3 — manual
```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python seed.py                   # creates demo data
uvicorn app:app --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173** 

##  Demo accounts

Password for all: **`demo123`**

| Role | Email |
|---|---|
| Buyer | `buyer@demo.com` |
| Company seller | `seller@demo.com` (TechNova Inc.) |
| Individual seller | `artisan@demo.com` (Amina Diallo) |
| Company seller | `maison@demo.com` (Maison Lumière) |

## 💳 Stripe payments

**Without a Stripe key**, checkout runs in **demo mode** — orders complete instantly, no real charge. Perfect for trying everything out.

**To accept real payments** (free test mode):
1. Create a free account at [stripe.com](https://stripe.com) and switch to **Test mode**
2. Copy your test **Secret key** (starts with `sk_test_`)
3. Create `backend/.env` (or set env vars) with:
   ```
   STRIPE_SECRET_KEY=sk_test_your_key_here
   FRONTEND_URL=http://localhost:5173
   ```
4. Restart the backend

With a key set, checkout redirects buyers to Stripe's secure hosted payment page. Use test card `4242 4242 4242 4242` (any future expiry, any CVC). The app verifies every payment with Stripe before finalizing the order — stock and carts only update after a confirmed payment.

> Currency is set to **CAD** in `backend/app.py` (`_stripe_session_for`). Change `currency: "cad"` to your own if needed.

##  Project structure

```
bb24market/
├── backend/
│   ├── app.py           # FastAPI app: auth, products, cart, orders, Stripe
│   ├── models.py        # SQLAlchemy models (SQLite)
│   ├── schemas.py       # Pydantic schemas
│   ├── auth.py          # JWT + bcrypt
│   ├── seed.py          # Demo data (24 products, 4 users)
│   ├── requirements.txt
│   └── market.db        # SQLite database (created by seed.py)
├── frontend/
│   ├── src/
│   │   ├── pages/       # Home, ProductDetail, Cart, Checkout, Orders, …
│   │   ├── components/  # Header, ProductCard, Stars, badges, …
│   │   ├── api.js       # API client
│   │   └── AuthContext.jsx
│   └── vite.config.js   # Dev proxy: /api → localhost:8000
├── start.sh / start.bat
└── README.md
```

##  API overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register (buyer / seller, individual / company) |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/products` | Browse (`?search=&category=&sort=`) |
| GET/POST | `/api/cart` | Cart management |
| POST | `/api/orders/checkout` | Create order (+ Stripe session URL) |
| POST | `/api/payments/confirm` | Verify Stripe payment, finalize order |
| POST | `/api/products` | Create product (seller) |
| PUT/DELETE | `/api/products/{id}` | Edit / delete own product (seller) |
| GET | `/api/seller/products` | Seller's own listings |
| GET/PUT | `/api/seller/orders…` | Seller orders + status |
| POST | `/api/products/{id}/reviews` | Verified-purchase reviews |

Full interactive docs at **http://localhost:8000/docs** when the backend runs.

— happy selling!
