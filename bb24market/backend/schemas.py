"""Pydantic request/response schemas."""
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------- auth ----------

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    role: str = Field(default="buyer", pattern="^(buyer|seller)$")
    seller_type: Optional[str] = Field(default=None, pattern="^(individual|company)$")
    company_name: Optional[str] = Field(default=None, max_length=160)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    seller_type: Optional[str] = None
    company_name: Optional[str] = None

    class Config:
        from_attributes = True


class AuthOut(BaseModel):
    token: str
    user: UserOut


# ---------- products ----------

class ProductIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(default="", max_length=5000)
    price: float = Field(gt=0, le=1000000)  # dollars
    category: str = Field(default="General", max_length=80)
    image: str = Field(default="", max_length=500)
    stock: int = Field(default=1, ge=0, le=100000)


class ProductOut(BaseModel):
    id: int
    title: str
    description: str
    price: float
    price_cents: int
    category: str
    image: str
    stock: int
    seller_id: int
    seller_name: str
    seller_type: Optional[str] = None
    company_name: Optional[str] = None
    rating: float
    reviews_count: int

    class Config:
        from_attributes = True


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=2000)


class ReviewOut(BaseModel):
    id: int
    rating: int
    comment: str
    user_name: str
    created_at: str


class ProductDetailOut(ProductOut):
    reviews: List[ReviewOut] = []


# ---------- cart ----------

class CartAddIn(BaseModel):
    product_id: int
    qty: int = Field(default=1, ge=1, le=99)


class CartUpdateIn(BaseModel):
    qty: int = Field(ge=1, le=99)


class CartItemOut(BaseModel):
    product_id: int
    title: str
    image: str
    price: float
    price_cents: int
    qty: int
    stock: int
    seller_name: str


class CartOut(BaseModel):
    items: List[CartItemOut]
    total_cents: int
    total: float


# ---------- orders ----------

class CheckoutIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    address: str = Field(min_length=3, max_length=255)
    city: str = Field(min_length=2, max_length=120)
    postal: str = Field(min_length=3, max_length=30)
    country: str = Field(min_length=2, max_length=80)
    payment_method: str = Field(default="card", pattern="^(card|paypal|applepay|cash)$")


class ProfileUpdateIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    role: Optional[str] = Field(default=None, pattern="^(buyer|seller)$")
    seller_type: Optional[str] = Field(default=None, pattern="^(individual|company)$")
    company_name: Optional[str] = Field(default=None, max_length=160)


class OfferIn(BaseModel):
    amount: float = Field(gt=0, le=1000000)


class OrderItemOut(BaseModel):
    product_id: int
    title: str
    price: float
    qty: int
    seller_id: int
    seller_name: str


class OrderOut(BaseModel):
    id: int
    total: float
    total_cents: int
    status: str
    name: str
    address: str
    city: str
    postal: str
    country: str
    created_at: str
    items: List[OrderItemOut]


class OrderStatusIn(BaseModel):
    status: str = Field(pattern="^(placed|shipped|delivered|cancelled)$")


class ConfirmIn(BaseModel):
    session_id: str = Field(min_length=5, max_length=200)


class CheckoutSessionIn(BaseModel):
    order_id: int
