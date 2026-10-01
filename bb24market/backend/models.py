"""SQLAlchemy models for BB24Market."""
from datetime import datetime

from sqlalchemy import (
    Column, DateTime, ForeignKey, Integer, String, Text, create_engine
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    # 'buyer' or 'seller'
    role = Column(String(20), nullable=False, default="buyer")
    # for sellers: 'individual' or 'company'
    seller_type = Column(String(20), nullable=True)
    company_name = Column(String(160), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="seller", cascade="all, delete-orphan")
    cart_items = relationship("CartItem", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="buyer", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False, default="")
    price_cents = Column(Integer, nullable=False, default=0)
    category = Column(String(80), nullable=False, default="General", index=True)
    image = Column(String(500), nullable=False, default="")
    stock = Column(Integer, nullable=False, default=1)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    seller = relationship("User", back_populates="products")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    qty = Column(Integer, nullable=False, default=1)

    user = relationship("User", back_populates="cart_items")
    product = relationship("Product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    total_cents = Column(Integer, nullable=False, default=0)
    # placed -> shipped -> delivered (or cancelled)
    status = Column(String(20), nullable=False, default="placed")
    name = Column(String(160), nullable=False, default="")
    address = Column(String(255), nullable=False, default="")
    city = Column(String(120), nullable=False, default="")
    postal = Column(String(30), nullable=False, default="")
    country = Column(String(80), nullable=False, default="")
    payment_method = Column(String(40), nullable=False, default="card")
    created_at = Column(DateTime, default=datetime.utcnow)

    buyer = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    price_cents = Column(Integer, nullable=False)
    qty = Column(Integer, nullable=False, default=1)

    order = relationship("Order", back_populates="items")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1..5
    comment = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")


class Offer(Base):
    """A buyer's price proposal on a product — the friendly haggle."""
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount_cents = Column(Integer, nullable=False)
    # pending | accepted | declined | redeemed | expired
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)


def get_engine(db_path="market.db"):
    return create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})


def get_session_factory(engine):
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)
