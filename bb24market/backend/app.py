"""BB24Market API — FastAPI backend."""
import os
from datetime import datetime

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

import stripe
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

import auth
from models import (
    Base, CartItem, Offer, Order, OrderItem, Product, Review, User,
    get_engine, get_session_factory,
)
from schemas import (
    AuthOut, CartAddIn, CartOut, CartItemOut, CartUpdateIn, CheckoutIn,
    CheckoutSessionIn, ConfirmIn, LoginIn, OfferIn, OrderOut, OrderItemOut,
    OrderStatusIn, ProductDetailOut, ProductIn, ProductOut, ProfileUpdateIn,
    RegisterIn, ReviewIn, ReviewOut, UserOut,
)

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

DB_PATH = os.getenv("MARKET_DB", os.path.join(os.path.dirname(__file__), "market.db"))
engine = get_engine(DB_PATH)
SessionFactory = get_session_factory(engine)
Base.metadata.create_all(engine)

app = FastAPI(title="BB24Market API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# wire the real session factory into auth's dependency (resolved at call time)
auth.set_session_factory(SessionFactory)
get_db = auth.get_db

CATEGORIES = ["Electronics", "Fashion", "Home & Kitchen", "Beauty", "Sports", "Books", "Toys", "General"]


# ---------- helpers ----------

def seller_display(user: User) -> dict:
    return {
        "seller_name": user.company_name or user.name,
        "seller_type": user.seller_type,
        "company_name": user.company_name,
    }


def product_out(p: Product, db: Session) -> dict:
    agg = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .filter(Review.product_id == p.id)
        .first()
    )
    avg, count = agg[0] or 0, agg[1] or 0
    return {
        "id": p.id,
        "title": p.title,
        "description": p.description,
        "price": round(p.price_cents / 100, 2),
        "price_cents": p.price_cents,
        "category": p.category,
        "image": p.image,
        "stock": p.stock,
        "seller_id": p.seller_id,
        **seller_display(p.seller),
        "rating": round(float(avg), 1),
        "reviews_count": count,
    }


def order_out(o: Order, db: Session) -> dict:
    items = []
    for it in o.items:
        seller = db.query(User).filter(User.id == it.seller_id).first()
        items.append({
            "product_id": it.product_id,
            "title": it.title,
            "price": round(it.price_cents / 100, 2),
            "qty": it.qty,
            "seller_id": it.seller_id,
            "seller_name": (seller.company_name or seller.name) if seller else "?",
        })
    return {
        "id": o.id,
        "total": round(o.total_cents / 100, 2),
        "total_cents": o.total_cents,
        "status": o.status,
        "name": o.name,
        "address": o.address,
        "city": o.city,
        "postal": o.postal,
        "country": o.country,
        "created_at": o.created_at.isoformat() if o.created_at else "",
        "items": items,
    }


# ---------- auth ----------

@app.post("/api/auth/register", response_model=AuthOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "An account with this email already exists")
    if body.role == "seller" and not body.seller_type:
        raise HTTPException(400, "Choose individual or company for a seller account")
    user = User(
        name=body.name.strip(),
        email=email,
        password_hash=auth.hash_password(body.password),
        role=body.role,
        seller_type=body.seller_type if body.role == "seller" else None,
        company_name=(body.company_name or "").strip() or None
        if body.role == "seller" and body.seller_type == "company" else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": auth.make_token(user), "user": user}


@app.post("/api/auth/login", response_model=AuthOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower().strip()).first()
    if not user or not auth.verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return {"token": auth.make_token(user), "user": user}


@app.get("/api/auth/me", response_model=UserOut)
def me(user: User = Depends(auth.get_current_user)):
    return user


@app.patch("/api/users/me", response_model=UserOut)
def update_profile(
    body: ProfileUpdateIn,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if body.name is not None:
        user.name = body.name.strip()
    new_role = body.role or user.role
    if new_role == "seller":
        st = body.seller_type if body.seller_type is not None else user.seller_type
        if not st:
            raise HTTPException(400, "Choose individual or company to start selling")
        user.seller_type = st
        if st == "company":
            cn = body.company_name if body.company_name is not None else user.company_name
            if not (cn or "").strip():
                raise HTTPException(400, "Enter your company name")
            user.company_name = cn.strip()
        else:
            user.company_name = None
    else:
        user.seller_type = None
        user.company_name = None
    user.role = new_role
    db.commit()
    db.refresh(user)
    return user


# ---------- products ----------

@app.get("/api/categories")
def categories():
    return CATEGORIES


@app.get("/api/products", response_model=list[ProductOut])
def list_products(
    search: str = Query(default=""),
    category: str = Query(default=""),
    sort: str = Query(default="new", pattern="^(new|price_asc|price_desc|rating)$"),
    seller_id: int = Query(default=0),
    db: Session = Depends(get_db),
):
    q = db.query(Product)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Product.title.ilike(like), Product.description.ilike(like)))
    if category:
        q = q.filter(Product.category == category)
    if seller_id:
        q = q.filter(Product.seller_id == seller_id)
    if sort == "price_asc":
        q = q.order_by(Product.price_cents.asc())
    elif sort == "price_desc":
        q = q.order_by(Product.price_cents.desc())
    else:
        q = q.order_by(Product.created_at.desc())
    products = q.limit(200).all()
    out = [product_out(p, db) for p in products]
    if sort == "rating":
        out.sort(key=lambda p: p["rating"], reverse=True)
    return out


@app.get("/api/products/{product_id}", response_model=ProductDetailOut)
def product_detail(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    data = product_out(p, db)
    revs = (
        db.query(Review).filter(Review.product_id == p.id)
        .order_by(Review.created_at.desc()).all()
    )
    data["reviews"] = [
        {
            "id": r.id,
            "rating": r.rating,
            "comment": r.comment,
            "user_name": r.user.name if r.user else "?",
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in revs
    ]
    return data


@app.post("/api/products", response_model=ProductOut, status_code=201)
def create_product(
    body: ProductIn,
    seller: User = Depends(auth.require_seller),
    db: Session = Depends(get_db),
):
    p = Product(
        title=body.title.strip(),
        description=body.description.strip(),
        price_cents=int(round(body.price * 100)),
        category=body.category.strip() or "General",
        image=body.image.strip(),
        stock=body.stock,
        seller_id=seller.id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return product_out(p, db)


@app.put("/api/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    body: ProductIn,
    seller: User = Depends(auth.require_seller),
    db: Session = Depends(get_db),
):
    p = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    p.title = body.title.strip()
    p.description = body.description.strip()
    p.price_cents = int(round(body.price * 100))
    p.category = body.category.strip() or "General"
    p.image = body.image.strip()
    p.stock = body.stock
    db.commit()
    db.refresh(p)
    return product_out(p, db)


@app.delete("/api/products/{product_id}")
def delete_product(
    product_id: int,
    seller: User = Depends(auth.require_seller),
    db: Session = Depends(get_db),
):
    p = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    db.delete(p)
    db.commit()
    return {"ok": True}


@app.get("/api/seller/products", response_model=list[ProductOut])
def my_products(seller: User = Depends(auth.require_seller), db: Session = Depends(get_db)):
    products = (
        db.query(Product).filter(Product.seller_id == seller.id)
        .order_by(Product.created_at.desc()).all()
    )
    return [product_out(p, db) for p in products]


# ---------- cart ----------

def cart_contents(user: User, db: Session) -> dict:
    items = db.query(CartItem).filter(CartItem.user_id == user.id).all()
    out_items = []
    total = 0
    for ci in items:
        p = db.query(Product).filter(Product.id == ci.product_id).first()
        if not p:
            db.delete(ci)
            continue
        out_items.append({
            "product_id": p.id,
            "title": p.title,
            "image": p.image,
            "price": round(p.price_cents / 100, 2),
            "price_cents": p.price_cents,
            "qty": ci.qty,
            "stock": p.stock,
            "seller_name": p.seller.company_name or p.seller.name,
        })
        total += p.price_cents * ci.qty
    db.commit()
    return {"items": out_items, "total_cents": total, "total": round(total / 100, 2)}


@app.get("/api/cart", response_model=CartOut)
def get_cart(user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return cart_contents(user, db)


@app.post("/api/cart", response_model=CartOut)
def add_to_cart(
    body: CartAddIn,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Product).filter(Product.id == body.product_id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    if p.stock < 1:
        raise HTTPException(400, "This product is out of stock")
    ci = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.product_id == body.product_id)
        .first()
    )
    if ci:
        ci.qty = min(ci.qty + body.qty, 99)
    else:
        db.add(CartItem(user_id=user.id, product_id=body.product_id, qty=body.qty))
    db.commit()
    return cart_contents(user, db)


@app.put("/api/cart/{product_id}", response_model=CartOut)
def update_cart(
    product_id: int,
    body: CartUpdateIn,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    ci = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.product_id == product_id)
        .first()
    )
    if not ci:
        raise HTTPException(404, "Item not in cart")
    ci.qty = body.qty
    db.commit()
    return cart_contents(user, db)


@app.delete("/api/cart/{product_id}", response_model=CartOut)
def remove_from_cart(
    product_id: int,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    db.query(CartItem).filter(
        CartItem.user_id == user.id, CartItem.product_id == product_id
    ).delete()
    db.commit()
    return cart_contents(user, db)


# ---------- orders & payments ----------
#
# Two modes:
#  - With STRIPE_SECRET_KEY set: checkout creates an order with status
#    "awaiting_payment" and a Stripe Checkout Session. The buyer pays on
#    Stripe's hosted page, then /api/payments/confirm verifies the payment
#    with Stripe and finalizes the order (stock, cart, status).
#  - Without it (demo mode): checkout completes immediately, no real charge.

def _finalize_order(order: Order, user: User, db: Session):
    """Decrement stock, clear the buyer's cart, mark the order placed."""
    for it in order.items:
        p = db.query(Product).filter(Product.id == it.product_id).first()
        if not p:
            raise HTTPException(400, f"'{it.title}' is no longer available")
        if p.stock < it.qty:
            raise HTTPException(400, f"Not enough stock for '{it.title}'")
    for it in order.items:
        p = db.query(Product).filter(Product.id == it.product_id).first()
        p.stock -= it.qty
    db.query(CartItem).filter(CartItem.user_id == user.id).delete()
    order.status = "placed"
    db.commit()
    db.refresh(order)


def _stripe_session_for(order: Order, db: Session) -> str:
    line_items = [
        {
            "price_data": {
                "currency": "cad",
                "unit_amount": it.price_cents,
                "product_data": {"name": it.title},
            },
            "quantity": it.qty,
        }
        for it in order.items
    ]
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=line_items,
        metadata={"order_id": str(order.id)},
        success_url=f"{FRONTEND_URL}/order-success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{FRONTEND_URL}/checkout?cancelled=1",
    )
    return session.url


@app.post("/api/orders/checkout", status_code=201)
def checkout(
    body: CheckoutIn,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    items = db.query(CartItem).filter(CartItem.user_id == user.id).all()
    if not items:
        raise HTTPException(400, "Your cart is empty")
    products = {}
    for ci in items:
        p = db.query(Product).filter(Product.id == ci.product_id).first()
        if not p:
            raise HTTPException(400, "A product in your cart is no longer available")
        if p.stock < ci.qty:
            raise HTTPException(400, f"Not enough stock for '{p.title}'")
        products[ci.product_id] = p
    order = Order(
        buyer_id=user.id,
        total_cents=0,
        status="awaiting_payment" if STRIPE_SECRET_KEY else "placed",
        name=body.name.strip(),
        address=body.address.strip(),
        city=body.city.strip(),
        postal=body.postal.strip(),
        country=body.country.strip(),
        payment_method="stripe" if STRIPE_SECRET_KEY else body.payment_method,
    )
    db.add(order)
    db.flush()
    total = 0
    for ci in items:
        p = products[ci.product_id]
        db.add(OrderItem(
            order_id=order.id,
            product_id=p.id,
            seller_id=p.seller_id,
            title=p.title,
            price_cents=p.price_cents,
            qty=ci.qty,
        ))
        total += p.price_cents * ci.qty
    order.total_cents = total
    db.commit()
    db.refresh(order)

    if STRIPE_SECRET_KEY:
        try:
            url = _stripe_session_for(order, db)
        except Exception as e:
            order.status = "cancelled"
            db.commit()
            raise HTTPException(502, f"Could not start Stripe payment: {e}")
        return {"order": order_out(order, db), "checkout_url": url, "stripe": True}

    # demo mode: no Stripe key, complete immediately
    _finalize_order(order, user, db)
    return {"order": order_out(order, db), "checkout_url": None, "stripe": False}


@app.post("/api/payments/checkout-session")
def create_checkout_session(
    body: CheckoutSessionIn,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(400, "Stripe is not configured")
    order = (
        db.query(Order)
        .filter(Order.id == body.order_id, Order.buyer_id == user.id)
        .first()
    )
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status != "awaiting_payment":
        raise HTTPException(400, "This order is already paid")
    try:
        url = _stripe_session_for(order, db)
    except Exception as e:
        raise HTTPException(502, f"Could not start Stripe payment: {e}")
    return {"checkout_url": url}


@app.post("/api/payments/confirm")
def confirm_payment(
    body: ConfirmIn,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(400, "Stripe is not configured")
    try:
        sess = stripe.checkout.Session.retrieve(body.session_id)
    except Exception:
        raise HTTPException(400, "Invalid payment session")
    if sess.payment_status != "paid":
        raise HTTPException(400, "Payment not completed yet")
    order_id = int((sess.metadata or {}).get("order_id", 0))
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.buyer_id == user.id)
        .first()
    )
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status == "awaiting_payment":
        _finalize_order(order, user, db)
    return {"order": order_out(order, db)}


@app.get("/api/orders", response_model=list[OrderOut])
def my_orders(user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    orders = (
        db.query(Order).filter(Order.buyer_id == user.id)
        .order_by(Order.created_at.desc()).all()
    )
    return [order_out(o, db) for o in orders]


@app.get("/api/seller/orders", response_model=list[OrderOut])
def seller_orders(seller: User = Depends(auth.require_seller), db: Session = Depends(get_db)):
    order_ids = (
        db.query(OrderItem.order_id).filter(OrderItem.seller_id == seller.id).distinct().all()
    )
    ids = [r[0] for r in order_ids]
    if not ids:
        return []
    orders = db.query(Order).filter(
        Order.id.in_(ids), Order.status != "awaiting_payment"
    ).order_by(Order.created_at.desc()).all()
    return [order_out(o, db) for o in orders]


@app.put("/api/seller/orders/{order_id}", response_model=OrderOut)
def update_order_status(
    order_id: int,
    body: OrderStatusIn,
    seller: User = Depends(auth.require_seller),
    db: Session = Depends(get_db),
):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(404, "Order not found")
    mine = any(it.seller_id == seller.id for it in o.items)
    if not mine:
        raise HTTPException(403, "This order has none of your products")
    o.status = body.status
    db.commit()
    db.refresh(o)
    return order_out(o, db)


# ---------- offers (make an offer 🤝) ----------

def offer_out(o: Offer, db: Session) -> dict:
    p = db.query(Product).filter(Product.id == o.product_id).first()
    buyer = db.query(User).filter(User.id == o.buyer_id).first()
    return {
        "id": o.id,
        "product_id": o.product_id,
        "product_title": p.title if p else "?",
        "product_image": p.image if p else "",
        "product_price": round(p.price_cents / 100, 2) if p else 0,
        "buyer_id": o.buyer_id,
        "buyer_name": buyer.name if buyer else "?",
        "seller_id": o.seller_id,
        "amount": round(o.amount_cents / 100, 2),
        "status": o.status,
        "created_at": o.created_at.isoformat() if o.created_at else "",
    }


@app.post("/api/products/{product_id}/offers", status_code=201)
def make_offer(
    product_id: int,
    body: OfferIn,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    if p.seller_id == user.id:
        raise HTTPException(400, "You can't make an offer on your own product")
    if p.stock < 1:
        raise HTTPException(400, "This product is out of stock")
    cents = int(round(body.amount * 100))
    if cents >= p.price_cents:
        raise HTTPException(400, "Your offer must be below the listed price — otherwise just add it to your cart! 😉")
    existing = (
        db.query(Offer)
        .filter(Offer.product_id == product_id, Offer.buyer_id == user.id, Offer.status == "pending")
        .first()
    )
    if existing:
        raise HTTPException(400, "You already have a pending offer on this item")
    o = Offer(product_id=product_id, buyer_id=user.id, seller_id=p.seller_id, amount_cents=cents)
    db.add(o)
    db.commit()
    db.refresh(o)
    return offer_out(o, db)


@app.get("/api/offers/mine")
def my_offers(user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    offers = (
        db.query(Offer).filter(Offer.buyer_id == user.id)
        .order_by(Offer.created_at.desc()).all()
    )
    return [offer_out(o, db) for o in offers]


@app.get("/api/seller/offers")
def seller_offers(seller: User = Depends(auth.require_seller), db: Session = Depends(get_db)):
    offers = (
        db.query(Offer).filter(Offer.seller_id == seller.id)
        .order_by(Offer.created_at.desc()).all()
    )
    return [offer_out(o, db) for o in offers]


@app.post("/api/seller/offers/{offer_id}/accept")
def accept_offer(
    offer_id: int,
    seller: User = Depends(auth.require_seller),
    db: Session = Depends(get_db),
):
    o = db.query(Offer).filter(Offer.id == offer_id, Offer.seller_id == seller.id).first()
    if not o:
        raise HTTPException(404, "Offer not found")
    if o.status != "pending":
        raise HTTPException(400, "This offer was already handled")
    o.status = "accepted"
    db.commit()
    db.refresh(o)
    return offer_out(o, db)


@app.post("/api/seller/offers/{offer_id}/decline")
def decline_offer(
    offer_id: int,
    seller: User = Depends(auth.require_seller),
    db: Session = Depends(get_db),
):
    o = db.query(Offer).filter(Offer.id == offer_id, Offer.seller_id == seller.id).first()
    if not o:
        raise HTTPException(404, "Offer not found")
    if o.status != "pending":
        raise HTTPException(400, "This offer was already handled")
    o.status = "declined"
    db.commit()
    db.refresh(o)
    return offer_out(o, db)


@app.post("/api/offers/{offer_id}/redeem", status_code=201)
def redeem_offer(
    offer_id: int,
    body: CheckoutIn,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Turn an accepted offer into an order at the agreed price."""
    o = db.query(Offer).filter(Offer.id == offer_id, Offer.buyer_id == user.id).first()
    if not o:
        raise HTTPException(404, "Offer not found")
    if o.status != "accepted":
        raise HTTPException(400, "This offer isn't available anymore")
    p = db.query(Product).filter(Product.id == o.product_id).first()
    if not p or p.stock < 1:
        raise HTTPException(400, "Sorry — this item just sold out")
    order = Order(
        buyer_id=user.id,
        total_cents=o.amount_cents,
        status="awaiting_payment" if STRIPE_SECRET_KEY else "placed",
        name=body.name.strip(),
        address=body.address.strip(),
        city=body.city.strip(),
        postal=body.postal.strip(),
        country=body.country.strip(),
        payment_method="stripe" if STRIPE_SECRET_KEY else body.payment_method,
    )
    db.add(order)
    db.flush()
    db.add(OrderItem(
        order_id=order.id,
        product_id=p.id,
        seller_id=p.seller_id,
        title=p.title,
        price_cents=o.amount_cents,
        qty=1,
    ))
    o.status = "redeemed"
    if not STRIPE_SECRET_KEY:
        # demo mode: finalize now (stock + cart), like the regular checkout does
        p.stock -= 1
        db.query(CartItem).filter(
            CartItem.user_id == user.id, CartItem.product_id == p.id
        ).delete()
        order.status = "placed"
    # Stripe mode: stock/cart are handled by /api/payments/confirm -> _finalize_order
    db.commit()
    db.refresh(order)

    if STRIPE_SECRET_KEY:
        try:
            url = _stripe_session_for(order, db)
        except Exception as e:
            order.status = "cancelled"
            db.commit()
            raise HTTPException(502, f"Could not start Stripe payment: {e}")
        return {"order": order_out(order, db), "checkout_url": url, "stripe": True}
    return {"order": order_out(order, db), "checkout_url": None, "stripe": False}


# ---------- reviews ----------

@app.post("/api/products/{product_id}/reviews", response_model=ReviewOut, status_code=201)
def add_review(
    product_id: int,
    body: ReviewIn,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    # must have purchased it
    bought = (
        db.query(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(Order.buyer_id == user.id, OrderItem.product_id == product_id)
        .first()
    )
    if not bought:
        raise HTTPException(400, "You can only review products you bought")
    existing = (
        db.query(Review)
        .filter(Review.product_id == product_id, Review.user_id == user.id)
        .first()
    )
    if existing:
        existing.rating = body.rating
        existing.comment = body.comment.strip()
        existing.created_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        r = existing
    else:
        r = Review(
            product_id=product_id, user_id=user.id,
            rating=body.rating, comment=body.comment.strip(),
        )
        db.add(r)
        db.commit()
        db.refresh(r)
    return {
        "id": r.id, "rating": r.rating, "comment": r.comment,
        "user_name": user.name,
        "created_at": r.created_at.isoformat() if r.created_at else "",
    }


@app.get("/api/health")
def health():
    return {"ok": True, "stripe": bool(STRIPE_SECRET_KEY)}
