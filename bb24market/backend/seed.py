"""Seed the database with demo sellers, products and accounts. Run: python seed.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from auth import hash_password  # noqa: E402
from models import Base, Product, User, get_engine, get_session_factory  # noqa: E402

DB_PATH = os.getenv("MARKET_DB", os.path.join(os.path.dirname(__file__), "market.db"))
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

engine = get_engine(DB_PATH)
Base.metadata.create_all(engine)
Session = get_session_factory(engine)
db = Session()

IMG = "https://picsum.photos/seed/{}/600/400"

sellers = [
    User(name="TechNova", email="seller@demo.com", password_hash=hash_password("demo123"),
         role="seller", seller_type="company", company_name="TechNova Inc."),
    User(name="Amina Diallo", email="artisan@demo.com", password_hash=hash_password("demo123"),
         role="seller", seller_type="individual"),
    User(name="Maison Lumière", email="maison@demo.com", password_hash=hash_password("demo123"),
         role="seller", seller_type="company", company_name="Maison Lumière"),
]
buyer = User(name="Demo Buyer", email="buyer@demo.com", password_hash=hash_password("demo123"), role="buyer")
db.add_all(sellers + [buyer])
db.commit()

PRODUCTS = [
    # (seller_idx, title, description, price, category, seed, stock)
    (0, "NovaBook Pro 14 Laptop", "14-inch laptop, 16GB RAM, 512GB SSD, perfect for work and study.", 899.99, "Electronics", "laptop14", 12),
    (0, "Wireless Noise-Cancelling Headphones", "Over-ear Bluetooth headphones with 30h battery life.", 129.99, "Electronics", "headphones", 30),
    (0, "Smart Watch Series 7", "Fitness tracking, heart-rate monitor, GPS, 10-day battery.", 199.99, "Electronics", "smartwatch", 25),
    (0, "Mechanical Keyboard RGB", "Hot-swappable mechanical keyboard with tactile switches.", 79.99, "Electronics", "keyboard", 40),
    (0, "4K Action Camera", "Waterproof action camera with image stabilization.", 249.99, "Electronics", "actioncam", 15),
    (0, "Portable Bluetooth Speaker", "360° sound, deep bass, 24h playtime, IPX7 waterproof.", 59.99, "Electronics", "speaker", 50),
    (1, "Handwoven Kente Scarf", "Authentic handwoven scarf, vibrant traditional patterns.", 34.99, "Fashion", "kente", 20),
    (1, "Leather Weekender Bag", "Full-grain leather travel bag, handmade stitching.", 149.99, "Fashion", "weekender", 8),
    (1, "Beaded Bracelet Set", "Set of 5 handmade beaded bracelets.", 19.99, "Fashion", "bracelets", 60),
    (1, " Ankara Print Dress", "Colorful Ankara wax-print summer dress, sizes S-XL.", 49.99, "Fashion", "ankaradress", 18),
    (1, "Wool Winter Toque", "Hand-knit wool toque, warm and soft.", 24.99, "Fashion", "toque", 35),
    (2, "Ceramic Pour-Over Coffee Set", "Handcrafted ceramic dripper, server and filters.", 44.99, "Home & Kitchen", "coffee", 22),
    (2, "Scented Soy Candle Trio", "Vanilla, sandalwood and citrus soy candles, 40h burn each.", 29.99, "Home & Kitchen", "candles", 45),
    (2, "Linen Duvet Cover Set", "100% stonewashed French linen, queen size.", 119.99, "Home & Kitchen", "linen", 10),
    (2, "Bamboo Cutting Board Set", "Set of 3 organic bamboo cutting boards.", 27.99, "Home & Kitchen", "bamboo", 55),
    (2, "Minimalist Wall Clock", "Silent sweep wall clock, oak finish.", 39.99, "Home & Kitchen", "clock", 28),
    (0, "Yoga Mat Pro", "6mm non-slip eco yoga mat with carrying strap.", 35.99, "Sports", "yogamat", 40),
    (0, "Adjustable Dumbbell Set", "Pair of adjustable dumbbells, 2.5-24kg each.", 179.99, "Sports", "dumbbell", 12),
    (1, "Shea Butter Body Cream", "Raw African shea butter whipped body cream, unscented.", 16.99, "Beauty", "shea", 70),
    (1, "Natural Soap Gift Box", "6 handmade cold-process soaps with essential oils.", 32.99, "Beauty", "soapbox", 33),
    (2, "The Art of Slow Living", "Bestselling hardcover on mindful living, 240 pages.", 24.99, "Books", "slowliving", 26),
    (2, "Modern African Recipes", "120 recipes from across the continent, full-color photos.", 29.99, "Books", "recipes", 19),
    (0, "Drone with 4K Camera", "Foldable drone, 30-min flight time, follow-me mode.", 349.99, "Toys", "drone", 9),
    (1, "Wooden Puzzle Set", "3 handcrafted wooden puzzles for kids.", 22.99, "Toys", "puzzle", 44),
]

for s_idx, title, desc, price, cat, seed, stock in PRODUCTS:
    db.add(Product(
        title=title.strip(), description=desc,
        price_cents=int(round(price * 100)), category=cat,
        image=IMG.format(seed), stock=stock,
        seller_id=sellers[s_idx].id,
    ))
db.commit()

print("Seeded:")
print("  sellers:", [(s.email, s.company_name or s.name) for s in sellers])
print("  buyer: buyer@demo.com / demo123  (sellers use demo123 too)")
print(f"  products: {db.query(Product).count()}")
