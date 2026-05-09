from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import razorpay
import os
import logging
import hmac
import hashlib
import jwt
import re
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Any, Dict

import admin_push


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_ANON_KEY = os.environ['SUPABASE_ANON_KEY']
SUPABASE_SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
RAZORPAY_KEY_ID = os.environ['RAZORPAY_KEY_ID']
RAZORPAY_KEY_SECRET = os.environ['RAZORPAY_KEY_SECRET']
JWT_SECRET = os.environ['JWT_SECRET']

# Supabase service-role client (bypasses RLS) for privileged backend ops
sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Razorpay client
rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

app = FastAPI(title="Fresh Cluck API")
api_router = APIRouter(prefix="/api")


# ----------------------- Security helpers -----------------------
# Sliding-window in-memory rate limiter. Per-process (fine for our 1-pod
# deployment); swap to Redis if we ever scale horizontally.
_rate_buckets: Dict[str, deque] = defaultdict(deque)
RATE_LIMITS = {
    # endpoint_key: (max_requests, window_seconds)
    "order": (5, 3600),         # 5 orders per hour per IP+phone
    "review": (3, 3600),        # 3 reviews per hour per IP
    "coupon_validate": (30, 60),  # 30 coupon checks per minute per IP
    "rider_login": (10, 600),   # 10 rider login attempts per 10 min per IP
    "profile_lookup": (60, 60), # 60 profile lookups per minute per IP
    "signup": (3, 3600),        # 3 signups per hour per IP+email
    "login": (10, 600),         # 10 logins per 10 min per IP+email
    "forgot_password": (3, 3600),  # 3 reset requests per hour per IP+email
}


def _client_ip(request: Request) -> str:
    """Extract the real client IP, respecting Vercel/Cloudflare/Kubernetes proxies."""
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(request: Request, bucket: str, extra_key: str = "") -> None:
    """Raises 429 if the caller has exceeded the per-bucket quota."""
    cap, window = RATE_LIMITS.get(bucket, (60, 60))
    key = f"{bucket}:{_client_ip(request)}:{extra_key}"
    now = time.time()
    dq = _rate_buckets[key]
    # Drop entries outside the sliding window
    while dq and dq[0] < now - window:
        dq.popleft()
    if len(dq) >= cap:
        retry = int(dq[0] + window - now) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Try again in {retry}s.",
            headers={"Retry-After": str(retry)},
        )
    dq.append(now)


# Reject obvious junk phone numbers (all same digit, sequential, etc.)
_PHONE_RE = re.compile(r"^[6-9]\d{9}$")  # Indian mobile: starts 6/7/8/9, 10 digits


def validate_indian_phone(phone: str) -> str:
    """Returns a cleaned phone string or raises HTTPException(400)."""
    cleaned = re.sub(r"\D", "", phone or "")
    if not _PHONE_RE.match(cleaned):
        raise HTTPException(400, "Enter a valid 10-digit Indian mobile number.")
    # Block all-same-digit numbers like 9999999999, 7777777777
    if len(set(cleaned)) == 1:
        raise HTTPException(400, "That phone number doesn't look real.")
    # Block trivially sequential numbers
    if cleaned in ("9876543210", "1234567890", "0123456789"):
        raise HTTPException(400, "That phone number doesn't look real.")
    return cleaned


def sanitize_text(value: str, max_len: int) -> str:
    """Strip control chars + zero-widths, collapse whitespace, enforce max length."""
    if not value:
        return ""
    # Remove control chars & zero-width chars used in homoglyph attacks
    cleaned = re.sub(r"[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]", "", value)
    # Collapse runs of whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:max_len]


def require_admin(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """FastAPI dependency that authorises the caller as an admin.

    Expects `Authorization: Bearer <supabase_access_token>`. Verifies the
    token with Supabase Auth, then checks the `user_roles` table for a row
    with role='admin'. Raises 401 if the token is invalid, 403 if the user
    isn't an admin.

    Use on any privileged endpoint:
        @api_router.get("/admin/something")
        async def endpoint(admin = Depends(require_admin)): ...
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(401, "Missing bearer token")
    try:
        user_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        user = user_client.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(401, "Invalid session")
        user_id = user.user.id
    except HTTPException:
        raise
    except Exception as e:
        logging.warning("admin token verification failed: %s", e)
        raise HTTPException(401, "Invalid session")
    # Role check using the service-role client so RLS can't be spoofed
    try:
        roles = sb.table("user_roles").select("role").eq(
            "user_id", user_id
        ).eq("role", "admin").limit(1).execute()
        if not roles.data:
            raise HTTPException(403, "Not an admin")
    except HTTPException:
        raise
    except Exception as e:
        logging.warning("role lookup failed: %s", e)
        raise HTTPException(500, "Role check failed")
    return {"user_id": user_id, "email": user.user.email}


_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_TIME_RE = re.compile(r"^\d{2}:\d{2}$")
ALLOWED_SLOT_STARTS = {"09:00", "11:00", "13:00", "15:00", "17:00", "19:00"}
SLOT_CAPACITY = 10  # max orders per (date, slot)


def slot_order_count(date: str, start: str) -> int:
    """How many non-cancelled orders are already booked into this slot."""
    try:
        res = sb.table("orders").select("id", count="exact").eq(
            "delivery_slot_date", date
        ).eq("delivery_slot_start", start).neq(
            "payment_status", "cancelled"
        ).execute()
        return int(getattr(res, "count", None) or len(res.data or []))
    except Exception as e:
        logging.warning("slot count failed: %s", e)
        return 0


def slot_fields(payload: "CreateOrderIn") -> Dict[str, Any]:
    """Validate the optional delivery slot fields and return a partial dict
    suitable for spreading into an `orders` insert. Returns an empty dict if
    no slot was provided. Raises 400 if shape is invalid."""
    if not (payload.delivery_slot_date or payload.delivery_slot_start):
        return {}
    if not (
        payload.delivery_slot_date
        and payload.delivery_slot_start
        and payload.delivery_slot_end
        and payload.delivery_slot_label
    ):
        raise HTTPException(400, "Incomplete delivery slot")
    if not _DATE_RE.match(payload.delivery_slot_date):
        raise HTTPException(400, "Invalid slot date")
    if not (
        _TIME_RE.match(payload.delivery_slot_start)
        and _TIME_RE.match(payload.delivery_slot_end)
    ):
        raise HTTPException(400, "Invalid slot time")
    if payload.delivery_slot_start not in ALLOWED_SLOT_STARTS:
        raise HTTPException(400, "Slot not allowed")
    # Soft capacity check (10 orders per slot). Race conditions could let an
    # 11th order squeak through under heavy concurrent load — that's fine for
    # a small shop and easier than a DB-level lock.
    if slot_order_count(payload.delivery_slot_date, payload.delivery_slot_start) >= SLOT_CAPACITY:
        raise HTTPException(409, "This slot is fully booked. Please pick another.")
    return {
        "delivery_slot_date": payload.delivery_slot_date,
        "delivery_slot_start": payload.delivery_slot_start,
        "delivery_slot_end": payload.delivery_slot_end,
        "delivery_slot_label": sanitize_text(payload.delivery_slot_label, 60),
    }


# ----------------------- Models -----------------------
class CartItem(BaseModel):
    product_id: str = Field(..., max_length=80)
    name: str = Field(..., max_length=120)
    qty: float = Field(..., gt=0, le=500)
    price: float = Field(..., ge=0, le=100000)


class CreateOrderIn(BaseModel):
    customer_name: str = Field(..., min_length=2, max_length=80)
    customer_phone: str = Field(..., min_length=10, max_length=15)
    customer_address: Optional[str] = Field("", max_length=400)
    delivery_lat: Optional[float] = Field(None, ge=-90, le=90)
    delivery_lng: Optional[float] = Field(None, ge=-180, le=180)
    items: List[CartItem] = Field(..., min_length=1, max_length=30)
    total_amount: float = Field(..., ge=0, le=200000)
    notes: Optional[str] = Field("", max_length=300)
    apply_first_order_discount: bool = False
    coupon_code: Optional[str] = Field(None, max_length=40)
    delivery_slot_date: Optional[str] = Field(None, max_length=10)   # 'YYYY-MM-DD'
    delivery_slot_start: Optional[str] = Field(None, max_length=5)   # 'HH:MM'
    delivery_slot_end: Optional[str] = Field(None, max_length=5)
    delivery_slot_label: Optional[str] = Field(None, max_length=60)


class CouponValidateIn(BaseModel):
    code: str = Field(..., min_length=2, max_length=40)
    phone: Optional[str] = Field(None, max_length=15)
    items_total: float = Field(..., ge=0, le=200000)


class VerifyPaymentIn(BaseModel):
    razorpay_order_id: str = Field(..., max_length=80)
    razorpay_payment_id: str = Field(..., max_length=80)
    razorpay_signature: str = Field(..., max_length=200)
    local_order_id: str = Field(..., max_length=80)


class RiderLoginIn(BaseModel):
    passcode: str = Field(..., min_length=1, max_length=20)


class ReviewIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    phone: Optional[str] = Field(None, max_length=15)
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=4, max_length=600)
    order_id: Optional[str] = Field(None, max_length=80)


class OrderStatusIn(BaseModel):
    payment_status: str = Field(..., max_length=30)

    @field_validator("payment_status")
    @classmethod
    def _allowed(cls, v: str) -> str:
        allowed = {"paid", "preparing", "ready", "out_for_delivery", "delivered",
                   "cancelled", "cod_pending"}
        if v not in allowed:
            raise ValueError(f"Invalid status. Must be one of: {sorted(allowed)}")
        return v


class WheelSpinIn(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)


# Simple in-memory order draft store (order_id -> draft)
ORDER_DRAFTS: Dict[str, dict] = {}


# ----------------------- Helpers -----------------------
def upsert_customer_profile(name: str, phone: str, address: Optional[str],
                            lat: Optional[float], lng: Optional[float]) -> None:
    """Best-effort upsert of customer profile keyed by phone. Failures are
    logged but never bubble up — saving an order should never fail because
    of a profile-cache write."""
    if not phone or len(phone) < 10:
        return
    try:
        sb.table("customer_profiles").upsert({
            "phone": phone,
            "name": name,
            "address": address or None,
            "lat": lat,
            "lng": lng,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }, on_conflict="phone").execute()
    except Exception as e:
        logging.warning("customer profile upsert failed: %s", e)


# ----------------------- First-order discount -----------------------
FIRST_ORDER_DISCOUNT_PCT = 10  # %

# Delivery fee policy: orders below FREE_DELIVERY_THRESHOLD pay DELIVERY_FEE.
# Threshold is measured against the items subtotal BEFORE any discount, so
# customers don't unexpectedly cross back below the threshold after a coupon.
FREE_DELIVERY_THRESHOLD = 299
DELIVERY_FEE = 20


def is_first_time_customer(phone: str) -> bool:
    """Returns True if the phone has never placed a saved order before."""
    if not phone or len(phone) < 10:
        return False
    try:
        res = sb.table("customer_profiles").select("phone").eq(
            "phone", phone
        ).limit(1).execute()
        return not bool(res.data)
    except Exception as e:
        logging.warning("first-time check failed for %s: %s", phone, e)
        return False


def _compute_coupon_discount(code: str, phone: Optional[str], items_total: float) -> Dict[str, Any]:
    """Validates a coupon code against current state. Returns a dict with:
        valid: bool, discount: float, error: str|None, coupon: row|None
    Validation rules:
        - code exists and is_active = true
        - not expired (valid_until is null or in the future)
        - items_total >= min_order_amount
        - phone hasn't already redeemed this code (if phone provided)"""
    code = (code or "").strip().upper()
    if not code:
        return {"valid": False, "discount": 0.0, "error": "Empty code", "coupon": None}
    try:
        res = sb.table("coupons").select("*").eq("code", code).limit(1).execute()
    except Exception as e:
        logging.warning("coupon lookup failed: %s", e)
        return {"valid": False, "discount": 0.0, "error": "Lookup failed", "coupon": None}
    if not res.data:
        return {"valid": False, "discount": 0.0, "error": "Invalid code", "coupon": None}
    c = res.data[0]
    if not c.get("is_active"):
        return {"valid": False, "discount": 0.0, "error": "Coupon disabled", "coupon": c}
    valid_until = c.get("valid_until")
    if valid_until:
        try:
            if datetime.fromisoformat(valid_until.replace("Z", "+00:00")) < datetime.now(timezone.utc):
                return {"valid": False, "discount": 0.0, "error": "Coupon expired", "coupon": c}
        except Exception:
            pass
    min_amt = float(c.get("min_order_amount") or 0)
    if items_total < min_amt:
        return {
            "valid": False, "discount": 0.0,
            "error": f"Add ₹{round(min_amt - items_total)} more to use this code (min ₹{round(min_amt)})",
            "coupon": c,
        }
    # Per-phone usage check (one-per-phone policy)
    if phone and len(phone) >= 10:
        try:
            uses = sb.table("coupon_uses").select("phone").eq(
                "code", code
            ).eq("phone", phone).limit(1).execute()
            if uses.data:
                return {
                    "valid": False, "discount": 0.0,
                    "error": "You've already used this code", "coupon": c,
                }
        except Exception as e:
            logging.warning("coupon usage check failed: %s", e)
    # Compute discount amount
    if c["discount_type"] == "pct":
        disc = items_total * float(c["discount_value"]) / 100.0
    else:  # flat
        disc = float(c["discount_value"])
    disc = round(min(disc, items_total), 2)  # never exceed total
    return {"valid": True, "discount": disc, "error": None, "coupon": c}


def resolve_order_total(payload: "CreateOrderIn") -> tuple[float, bool, Optional[str], float, str]:
    """Server-side source of truth for the order total. Considers BOTH the
    first-order 10% discount and any provided coupon — applies the bigger one.
    Then adds the delivery fee if items_total < FREE_DELIVERY_THRESHOLD.
    Returns (final_total, first_order_applied, coupon_code_applied,
            delivery_fee, notes_suffix)."""
    items_sum = sum((i.price or 0) * (i.qty or 0) for i in payload.items)
    items_sum = round(items_sum, 2)

    # Possibility 1: first-order 10% discount
    first_disc = 0.0
    if payload.apply_first_order_discount and is_first_time_customer(
        payload.customer_phone
    ):
        first_disc = round(items_sum * FIRST_ORDER_DISCOUNT_PCT / 100, 2)

    # Possibility 2: coupon discount
    coupon_disc = 0.0
    coupon_code_used: Optional[str] = None
    if payload.coupon_code:
        result = _compute_coupon_discount(
            payload.coupon_code, payload.customer_phone, items_sum
        )
        if result["valid"]:
            coupon_disc = result["discount"]
            coupon_code_used = (payload.coupon_code or "").strip().upper()

    # Delivery fee — based on the gross items subtotal so a coupon can never
    # accidentally re-trigger the fee.
    delivery_fee = 0.0 if items_sum >= FREE_DELIVERY_THRESHOLD else float(DELIVERY_FEE)
    fee_suffix = "" if delivery_fee == 0 else f" [Delivery fee +₹{int(delivery_fee)}]"

    # Whichever discount is bigger wins (they don't stack)
    if coupon_disc >= first_disc and coupon_disc > 0:
        final_total = round(items_sum - coupon_disc + delivery_fee, 2)
        suffix = f" [Coupon {coupon_code_used} applied: -₹{coupon_disc:.0f}]" + fee_suffix
        return final_total, False, coupon_code_used, delivery_fee, suffix
    if first_disc > 0:
        final_total = round(items_sum - first_disc + delivery_fee, 2)
        suffix = f" [First-order {FIRST_ORDER_DISCOUNT_PCT}% off applied]" + fee_suffix
        return final_total, True, None, delivery_fee, suffix
    return round(items_sum + delivery_fee, 2), False, None, delivery_fee, fee_suffix.lstrip()


def record_coupon_use(code: str, phone: str, order_id: Optional[str]) -> None:
    """Best-effort log of coupon redemption. Failures must never break the
    order — they just mean the customer might be able to reuse the code."""
    if not code or not phone or len(phone) < 10:
        return
    try:
        sb.table("coupon_uses").insert({
            "code": code.strip().upper(),
            "phone": phone,
            "order_id": order_id,
        }).execute()
    except Exception as e:
        logging.warning("coupon_use insert failed for %s/%s: %s", code, phone, e)


# ----------------------- Sunday Spinning Wheel -----------------------
# Weighted prize wheel. Probabilities sum to 1.0.
WHEEL_PRIZES = [
    {"label": "5% off",  "kind": "pct",  "value": 5,  "weight": 0.50},
    {"label": "10% off", "kind": "pct",  "value": 10, "weight": 0.20},
    {"label": "15% off", "kind": "pct",  "value": 15, "weight": 0.10},
    {"label": "Better luck next time", "kind": "none", "value": 0, "weight": 0.10},
    {"label": "₹50 off", "kind": "flat", "value": 50, "weight": 0.075},
    {"label": "₹75 off", "kind": "flat", "value": 75, "weight": 0.025},
]

# IST is UTC+5:30 with no DST, so we compute "is it Sunday in IST?" with a
# fixed offset rather than pulling in zoneinfo.
from datetime import timedelta as _td  # noqa: E402


def _ist_today() -> Any:
    """Returns today's date in IST."""
    now_utc = datetime.now(timezone.utc)
    return (now_utc + _td(hours=5, minutes=30)).date()


def _is_sunday_ist() -> bool:
    return _ist_today().weekday() == 6  # Mon=0 ... Sun=6


def _wheel_pick():
    """Weighted-random prize selection."""
    import random
    r = random.random()
    cum = 0.0
    for p in WHEEL_PRIZES:
        cum += p["weight"]
        if r <= cum:
            return p
    return WHEEL_PRIZES[-1]


def _is_wheel_enabled() -> bool:
    """Reads the admin toggle from shop_settings. Defaults to ON if column
    is missing (e.g. migration hasn't been run yet — fail-open is fine for
    a non-critical promo feature)."""
    try:
        res = sb.table("shop_settings").select("sunday_wheel_enabled").limit(1).execute()
        if res.data and res.data[0].get("sunday_wheel_enabled") is False:
            return False
    except Exception:
        pass
    return True


# ----------------------- Auth Helpers -----------------------
def create_rider_token() -> str:
    payload = {
        "role": "rider",
        "exp": int(time.time()) + 60 * 60 * 12,  # 12h
        "iat": int(time.time()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def require_rider(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing rider token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("role") != "rider":
        raise HTTPException(status_code=403, detail="Not a rider")
    return payload


# ----------------------- Public endpoints -----------------------
@api_router.get("/")
async def root():
    return {"ok": True, "service": "fresh-cluck"}


@api_router.get("/public/shop")
async def get_shop():
    try:
        res = sb.table("shop_settings").select(
            "id, shop_name, contact_phone, address, notice, upi_id, updated_at"
        ).limit(1).execute()
        if res.data:
            row = res.data[0]
            # Don't expose upi_id to public if sensitive; it's fine for UPI display anyway
            return row
        return {}
    except Exception as e:
        logging.exception("shop fetch failed")
        raise HTTPException(500, f"Failed to fetch shop: {e}")


@api_router.get("/public/products")
@api_router.get("/products")  # Mobile-friendly alias (same response shape)
async def get_products(include_unpriced: bool = False):
    """Returns active products joined with today's price.

    Price resolution order (per product):
      1. `daily_prices` row for today
      2. Most recent `daily_prices` row before today (last known price)
      3. Excluded from response (unless `include_unpriced=true` is passed,
         in which case we return `price: 0` so the client never sees null).

    Query params:
      - `include_unpriced=true` — keep unpriced products in the list with
        `price: 0` instead of dropping them.
    """
    from datetime import date
    today = date.today().isoformat()

    try:
        products_res = sb.table("products").select(
            "id, name, description, image_url, unit, sort_order, is_active"
        ).eq("is_active", True).order("sort_order").execute()
        products = products_res.data or []

        # 1. Today's prices.
        today_res = sb.table("daily_prices").select(
            "product_id, price_per_unit, price_date"
        ).eq("price_date", today).execute()
        price_map: Dict[str, float] = {
            p["product_id"]: float(p["price_per_unit"])
            for p in (today_res.data or [])
        }

        # 2. Per-product fallback: pull the latest historical price for
        #    every product that doesn't already have a price for today.
        missing_ids = [p["id"] for p in products if p["id"] not in price_map]
        if missing_ids:
            history_res = sb.table("daily_prices").select(
                "product_id, price_per_unit, price_date"
            ).in_("product_id", missing_ids).order(
                "price_date", desc=True
            ).limit(500).execute()
            for row in (history_res.data or []):
                pid = row["product_id"]
                # Order is desc, so the first row we see per product is the latest.
                if pid not in price_map:
                    price_map[pid] = float(row["price_per_unit"])

        # 3. Build the response. Drop unpriced products by default (so the
        #    Flutter app never has to special-case `null`); set to 0 if the
        #    caller explicitly opted in.
        out = []
        for p in products:
            price = price_map.get(p["id"])
            if price is None:
                if include_unpriced:
                    out.append({**p, "price": 0.0})
                # else: excluded from response
                continue
            out.append({**p, "price": price})

        return {"products": out, "date": today}
    except Exception as e:
        logging.exception("products fetch failed")
        raise HTTPException(500, f"Failed to fetch products: {e}")


@api_router.get("/public/products/{product_id}")
@api_router.get("/products/{product_id}")
async def get_product_by_id(product_id: str):
    """Single product lookup. Same price-resolution rules as the list
    endpoint (today → latest historical → 0)."""
    from datetime import date
    import re as _re
    if not _re.match(r"^[0-9a-fA-F-]{8,40}$", product_id):
        raise HTTPException(404, "Product not found")
    today = date.today().isoformat()
    try:
        prod_res = sb.table("products").select(
            "id, name, description, image_url, unit, sort_order, is_active"
        ).eq("id", product_id).limit(1).execute()
        if not prod_res.data:
            raise HTTPException(404, "Product not found")
        product = prod_res.data[0]
        # Today first.
        today_res = sb.table("daily_prices").select(
            "price_per_unit"
        ).eq("product_id", product_id).eq("price_date", today).limit(1).execute()
        price = float(today_res.data[0]["price_per_unit"]) if today_res.data else None
        # Latest historical fallback.
        if price is None:
            hist_res = sb.table("daily_prices").select(
                "price_per_unit"
            ).eq("product_id", product_id).order(
                "price_date", desc=True
            ).limit(1).execute()
            if hist_res.data:
                price = float(hist_res.data[0]["price_per_unit"])
        return {**product, "price": price if price is not None else 0.0}
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("single product fetch failed")
        raise HTTPException(500, f"Failed to fetch product: {e}")


# ----------------------- Customer profile (saved address) -----------------------
@api_router.get("/public/slot-availability")
async def slot_availability(request: Request):
    """Returns booked counts + capacity for today + tomorrow's slots so the
    customer's checkout picker can grey out full slots and show 'X left'."""
    rate_limit(request, "profile_lookup")
    today = datetime.now(timezone.utc).date()
    tomorrow = today.fromordinal(today.toordinal() + 1)
    dates = [today.isoformat(), tomorrow.isoformat()]
    out = []
    for d in dates:
        for s in sorted(ALLOWED_SLOT_STARTS):
            booked = slot_order_count(d, s)
            out.append({
                "date": d,
                "start": s,
                "booked": booked,
                "capacity": SLOT_CAPACITY,
                "full": booked >= SLOT_CAPACITY,
            })
    return {"slots": out, "capacity": SLOT_CAPACITY}


@api_router.get("/public/first-order-eligible/{phone}")
async def check_first_order_eligible(phone: str, request: Request):
    """Lightweight check for the checkout dialog — returns whether this phone
    is eligible for the first-order discount."""
    rate_limit(request, "profile_lookup")
    phone = (phone or "").strip()
    if len(phone) < 10:
        return {"eligible": False, "discount_pct": FIRST_ORDER_DISCOUNT_PCT}
    eligible = is_first_time_customer(phone)
    return {"eligible": eligible, "discount_pct": FIRST_ORDER_DISCOUNT_PCT}


@api_router.get("/public/customer-profile/{phone}")
async def get_customer_profile(phone: str, request: Request):
    """Look up the most-recent saved name + address + location for a phone
    number. Returns 404 if no profile exists yet."""
    phone = (phone or "").strip()
    if len(phone) < 10:
        raise HTTPException(400, "Invalid phone")
    try:
        res = sb.table("customer_profiles").select(
            "phone, name, address, lat, lng, updated_at"
        ).eq("phone", phone).limit(1).execute()
        if not res.data:
            raise HTTPException(404, "No saved profile")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logging.warning("profile lookup failed: %s", e)
        raise HTTPException(500, "Profile lookup failed")


# ----------------------- Reviews -----------------------
@api_router.get("/public/reviews")
async def list_public_reviews():
    """Returns up to 30 most-recent approved reviews."""
    try:
        res = sb.table("reviews").select(
            "id, name, rating, comment, created_at"
        ).eq("is_approved", True).order("created_at", desc=True).limit(30).execute()
        return {"reviews": res.data or []}
    except Exception as e:
        logging.warning("reviews fetch failed: %s", e)
        return {"reviews": []}


@api_router.post("/reviews")
async def create_review(body: ReviewIn, request: Request):
    """Public review submission. Always inserted as is_approved=false so the
    admin can moderate before it appears on the site."""
    rate_limit(request, "review")
    if body.rating < 1 or body.rating > 5:
        raise HTTPException(400, "Rating must be 1–5")
    name = sanitize_text(body.name or "", 80)
    comment = sanitize_text(body.comment or "", 600)
    if len(name) < 2 or len(comment) < 4:
        raise HTTPException(400, "Name and comment too short")
    phone = None
    if body.phone:
        try:
            phone = validate_indian_phone(body.phone)
        except HTTPException:
            phone = None  # phone is optional on reviews; ignore bad ones
    try:
        sb.table("reviews").insert({
            "name": name,
            "phone": phone,
            "rating": body.rating,
            "comment": comment,
            "is_approved": False,
            "order_id": body.order_id or None,
        }).execute()
        return {"ok": True, "message": "Thanks! Your review will appear once approved."}
    except Exception as e:
        logging.exception("review insert failed")
        raise HTTPException(500, f"Could not save review: {e}")


# ----------------------- Coupons -----------------------
@api_router.get("/wheel/status")
async def wheel_status(phone: Optional[str] = None, request: Request = None):
    """Returns whether the wheel is spinnable right now for the given phone.
    Always safe to call — returns a structured "why not" if not eligible."""
    if request:
        rate_limit(request, "profile_lookup")
    if not _is_wheel_enabled():
        return {"eligible": False, "reason": "disabled", "is_sunday": _is_sunday_ist()}
    if not _is_sunday_ist():
        return {"eligible": False, "reason": "not_sunday", "is_sunday": False}
    if not phone:
        return {"eligible": True, "reason": None, "is_sunday": True}
    try:
        validate_indian_phone(phone)
    except HTTPException:
        return {"eligible": False, "reason": "invalid_phone", "is_sunday": True}
    today_ist = _ist_today().isoformat()
    try:
        res = sb.table("wheel_spins").select(
            "prize_label, prize_kind, prize_value, coupon_code"
        ).eq("phone", phone).eq("spin_date", today_ist).limit(1).execute()
        if res.data:
            return {
                "eligible": False, "reason": "already_spun",
                "is_sunday": True, "prize": res.data[0],
            }
    except Exception as e:
        logging.warning("wheel status check failed: %s", e)
    return {"eligible": True, "reason": None, "is_sunday": True}


@api_router.post("/wheel/spin")
async def wheel_spin(body: WheelSpinIn, request: Request):
    """Atomically spins the wheel for this phone. Server picks the prize so
    customers can't fake a win."""
    rate_limit(request, "review")  # reuse strict bucket — 3/hr is fine for spins
    phone = validate_indian_phone(body.phone)
    if not _is_wheel_enabled():
        raise HTTPException(403, "Wheel is currently disabled")
    if not _is_sunday_ist():
        raise HTTPException(403, "Wheel only spins on Sundays")
    today_ist = _ist_today().isoformat()
    # Per-phone-per-day enforcement via PK race-safe check
    try:
        existing = sb.table("wheel_spins").select(
            "prize_label, prize_kind, prize_value, coupon_code"
        ).eq("phone", phone).eq("spin_date", today_ist).limit(1).execute()
        if existing.data:
            return {"ok": False, "already_spun": True, "prize": existing.data[0]}
    except Exception as e:
        logging.warning("wheel pre-check failed: %s", e)

    prize = _wheel_pick()
    coupon_code = None
    if prize["kind"] != "none":
        # Generate a unique one-time code tied to this phone's last 4 digits
        suffix = uuid.uuid4().hex[:4].upper()
        tail = (phone or "")[-4:]
        coupon_code = f"SUN{tail}{suffix}"
        # Coupon is valid for 7 days, single use per phone enforced by
        # coupon_uses table when redeemed.
        valid_until = (datetime.now(timezone.utc) + _td(days=7)).isoformat()
        try:
            sb.table("coupons").insert({
                "code": coupon_code,
                "discount_type": prize["kind"],   # 'pct' or 'flat'
                "discount_value": prize["value"],
                "min_order_amount": 0,
                "valid_until": valid_until,
                "is_active": True,
            }).execute()
        except Exception as e:
            logging.exception("wheel coupon insert failed")
            raise HTTPException(500, f"Could not generate coupon: {e}")

    # Record the spin (idempotent — PK collision means already spun)
    try:
        sb.table("wheel_spins").insert({
            "phone": phone,
            "spin_date": today_ist,
            "prize_label": prize["label"],
            "prize_kind": prize["kind"],
            "prize_value": prize["value"],
            "coupon_code": coupon_code,
        }).execute()
    except Exception as e:
        # If this fails because of PK collision, return the existing prize so
        # the customer doesn't see a generic error.
        try:
            again = sb.table("wheel_spins").select(
                "prize_label, prize_kind, prize_value, coupon_code"
            ).eq("phone", phone).eq("spin_date", today_ist).limit(1).execute()
            if again.data:
                return {"ok": False, "already_spun": True, "prize": again.data[0]}
        except Exception:
            pass
        logging.exception("wheel spin insert failed")
        raise HTTPException(500, f"Could not save spin: {e}")

    return {
        "ok": True,
        "already_spun": False,
        "prize": {
            "label": prize["label"],
            "kind": prize["kind"],
            "value": prize["value"],
            "coupon_code": coupon_code,
        },
        # Index of the winning segment so the frontend animation lands on it.
        "segment_index": next(
            (i for i, p in enumerate(WHEEL_PRIZES) if p["label"] == prize["label"]),
            0,
        ),
        "segments": [{"label": p["label"]} for p in WHEEL_PRIZES],
    }


@api_router.post("/coupons/validate")
async def validate_coupon(body: CouponValidateIn, request: Request):
    """Live validation called from the checkout dialog. Returns the discount
    amount or a friendly error message. Does NOT redeem the coupon — that
    only happens when the order is placed."""
    rate_limit(request, "coupon_validate")
    if body.items_total <= 0:
        return {"valid": False, "discount": 0, "error": "Cart is empty"}
    result = _compute_coupon_discount(body.code, body.phone, body.items_total)
    return {
        "valid": result["valid"],
        "discount": result["discount"],
        "error": result["error"],
    }


# ----------------------- Razorpay payment -----------------------
@api_router.post("/payments/create-order")
async def create_payment_order(payload: CreateOrderIn, request: Request):
    """Create a Razorpay order and remember the draft locally until verify."""
    payload.customer_phone = validate_indian_phone(payload.customer_phone)
    payload.customer_name = sanitize_text(payload.customer_name, 80)
    payload.customer_address = sanitize_text(payload.customer_address or "", 400)
    payload.notes = sanitize_text(payload.notes or "", 300)
    rate_limit(request, "order", extra_key=payload.customer_phone)
    if not payload.items:
        raise HTTPException(400, "Empty cart")
    # Server is the source of truth for total — re-compute from items, apply
    # the bigger of (first-order discount, coupon discount) only if eligible.
    final_total, first_order_applied, coupon_used, delivery_fee, note_suffix = resolve_order_total(payload)
    if final_total <= 0:
        raise HTTPException(400, "Empty cart")
    try:
        amount_paise = int(round(final_total * 100))
        receipt = f"fc_{uuid.uuid4().hex[:12]}"
        rzp_order = rzp_client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
        })
        local_id = str(uuid.uuid4())
        # Persist the server-computed total + discount note onto the draft so
        # /payments/verify uses the correct numbers when inserting the order.
        draft = payload.dict()
        draft["total_amount"] = final_total
        draft["notes"] = (draft.get("notes") or "") + note_suffix
        draft["_first_order_applied"] = first_order_applied
        draft["_coupon_used"] = coupon_used
        draft["_delivery_fee"] = delivery_fee
        ORDER_DRAFTS[local_id] = {
            "rzp_order_id": rzp_order["id"],
            "draft": draft,
        }
        return {
            "local_order_id": local_id,
            "razorpay_order_id": rzp_order["id"],
            "razorpay_key_id": RAZORPAY_KEY_ID,
            "amount": amount_paise,
            "currency": "INR",
            "discount_applied": first_order_applied or bool(coupon_used),
            "first_order_applied": first_order_applied,
            "coupon_used": coupon_used,
            "delivery_fee": delivery_fee,
            "final_total": final_total,
        }
    except Exception as e:
        logging.exception("razorpay order failed")
        raise HTTPException(500, f"Payment order failed: {e}")


@api_router.post("/payments/verify")
async def verify_payment(body: VerifyPaymentIn):
    """Verify Razorpay signature and insert order into Supabase."""
    draft_info = ORDER_DRAFTS.get(body.local_order_id)
    if not draft_info:
        raise HTTPException(404, "Order draft not found or expired")
    if draft_info["rzp_order_id"] != body.razorpay_order_id:
        raise HTTPException(400, "Order id mismatch")

    # Verify signature
    try:
        generated = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(generated, body.razorpay_signature):
            raise HTTPException(400, "Invalid payment signature")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Signature check failed: {e}")

    draft = draft_info["draft"]
    # Insert into Supabase orders via service role
    try:
        insert_payload = {
            "customer_name": draft["customer_name"],
            "customer_phone": draft["customer_phone"],
            "customer_address": draft.get("customer_address") or None,
            "items": draft["items"],  # JSONB
            "total_amount": draft["total_amount"],
            "payment_status": "paid",
            "upi_txn_ref": body.razorpay_payment_id,
            "notes": draft.get("notes") or None,
            "delivery_lat": draft.get("delivery_lat"),
            "delivery_lng": draft.get("delivery_lng"),
        }
        # Carry forward optional delivery slot fields from the draft
        for k in ("delivery_slot_date", "delivery_slot_start",
                  "delivery_slot_end", "delivery_slot_label"):
            if draft.get(k):
                insert_payload[k] = draft[k]
        res = sb.table("orders").insert(insert_payload).execute()
        order_row = res.data[0] if res.data else None
        # Clean up draft
        ORDER_DRAFTS.pop(body.local_order_id, None)
        # Persist customer profile so next order auto-prefills
        upsert_customer_profile(
            draft["customer_name"], draft["customer_phone"],
            draft.get("customer_address"),
            draft.get("delivery_lat"), draft.get("delivery_lng"),
        )
        # Record coupon redemption (if any)
        coupon_used = draft.get("_coupon_used")
        if coupon_used and order_row:
            record_coupon_use(coupon_used, draft["customer_phone"], order_row.get("id"))
        notify_admins_new_order(order_row)
        return {"ok": True, "order": order_row}
    except Exception as e:
        logging.exception("order insert failed")
        raise HTTPException(500, f"Could not save order: {e}")


@api_router.post("/orders/cod")
async def create_cod_order(payload: CreateOrderIn, request: Request):
    """Cash-on-delivery: insert the order directly with payment_status='cod_pending'."""
    payload.customer_phone = validate_indian_phone(payload.customer_phone)
    payload.customer_name = sanitize_text(payload.customer_name, 80)
    payload.customer_address = sanitize_text(payload.customer_address or "", 400)
    payload.notes = sanitize_text(payload.notes or "", 300)
    rate_limit(request, "order", extra_key=payload.customer_phone)
    if not payload.items:
        raise HTTPException(400, "Empty cart")
    final_total, first_order_applied, coupon_used, delivery_fee, note_suffix = resolve_order_total(payload)
    if final_total <= 0:
        raise HTTPException(400, "Empty cart")
    try:
        insert_payload = {
            "customer_name": payload.customer_name,
            "customer_phone": payload.customer_phone,
            "customer_address": payload.customer_address or None,
            "items": [i.dict() for i in payload.items],
            "total_amount": final_total,
            "payment_status": "cod_pending",
            "upi_txn_ref": None,
            "notes": (payload.notes or "") + note_suffix or None,
            "delivery_lat": payload.delivery_lat,
            "delivery_lng": payload.delivery_lng,
            **slot_fields(payload),
        }
        res = sb.table("orders").insert(insert_payload).execute()
        order_row = res.data[0] if res.data else None
        # Persist customer profile so next order auto-prefills
        upsert_customer_profile(
            payload.customer_name, payload.customer_phone,
            payload.customer_address,
            payload.delivery_lat, payload.delivery_lng,
        )
        # Record coupon redemption (if any)
        if coupon_used and order_row:
            record_coupon_use(coupon_used, payload.customer_phone, order_row.get("id"))
        notify_admins_new_order(order_row)
        return {
            "ok": True, "order": order_row,
            "discount_applied": first_order_applied or bool(coupon_used),
            "first_order_applied": first_order_applied,
            "coupon_used": coupon_used,
            "delivery_fee": delivery_fee,
        }
    except Exception as e:
        logging.exception("cod order failed")
        raise HTTPException(500, f"Could not save order: {e}")


# ----------------------- Rider -----------------------
@api_router.post("/rider/login")
async def rider_login(body: RiderLoginIn, request: Request):
    rate_limit(request, "rider_login")
    try:
        res = sb.table("shop_settings").select("rider_passcode").limit(1).execute()
        if not res.data:
            raise HTTPException(500, "Shop not configured")
        if body.passcode.strip() != str(res.data[0].get("rider_passcode", "")).strip():
            raise HTTPException(401, "Invalid passcode")
        return {"token": create_rider_token()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Login failed: {e}")


@api_router.get("/rider/orders")
async def rider_orders(_: dict = Depends(require_rider)):
    try:
        res = sb.table("orders").select("*").in_(
            "payment_status", ["paid", "preparing", "ready", "out_for_delivery", "cod_pending"]
        ).order("created_at", desc=True).limit(100).execute()
        return {"orders": res.data or []}
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch: {e}")


@api_router.post("/rider/orders/{order_id}/status")
async def rider_update_status(
    order_id: str, body: OrderStatusIn, _: dict = Depends(require_rider)
):
    try:
        res = sb.table("orders").update(
            {"payment_status": body.payment_status}
        ).eq("id", order_id).execute()
        return {"ok": True, "order": (res.data or [None])[0]}
    except Exception as e:
        raise HTTPException(500, f"Update failed: {e}")


# ----------------------- One-time admin seed -----------------------
class SeedIn(BaseModel):
    email: str
    password: str
    rider_passcode: Optional[str] = None
    secret: str  # must match server-side JWT_SECRET to execute


@api_router.post("/admin/seed")
async def seed_admin(body: SeedIn, request: Request):
    if body.secret != JWT_SECRET:
        raise HTTPException(403, "Forbidden")
    rate_limit(request, "rider_login")  # reuse the strict rider-login bucket
    # Guard: refuse to run if an admin already exists. This neutralizes the
    # endpoint after first use so a leaked JWT_SECRET can't create new admins.
    try:
        existing = sb.table("user_roles").select("user_id").eq("role", "admin").limit(1).execute()
        if existing.data:
            raise HTTPException(409, "Admin already provisioned. Seed disabled.")
    except HTTPException:
        raise
    except Exception as e:
        logging.warning("admin existence check failed: %s", e)
    try:
        # 1. Create or find user
        user_id = None
        try:
            created = sb.auth.admin.create_user({
                "email": body.email,
                "password": body.password,
                "email_confirm": True,
            })
            user_id = created.user.id
        except Exception as e:
            # User probably exists - find by email
            logging.warning(f"create_user failed (likely exists): {e}")
            users = sb.auth.admin.list_users()
            for u in users:
                if getattr(u, "email", None) == body.email:
                    user_id = u.id
                    break
            if not user_id:
                raise HTTPException(500, f"Could not create or find user: {e}")

        # 2. Assign admin role (idempotent via unique constraint)
        try:
            sb.table("user_roles").insert({
                "user_id": user_id,
                "role": "admin",
            }).execute()
        except Exception as e:
            # likely unique violation - ignore
            logging.warning(f"user_roles insert failed (likely exists): {e}")

        # 3. Update rider_passcode
        if body.rider_passcode:
            sb.table("shop_settings").update(
                {"rider_passcode": body.rider_passcode}
            ).neq("id", "00000000-0000-0000-0000-000000000000").execute()

        # 4. Create product-images storage bucket (public)
        try:
            sb.storage.create_bucket("product-images", options={"public": True})
        except Exception as e:
            logging.warning(f"bucket create skipped: {e}")

        return {"ok": True, "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("seed failed")
        raise HTTPException(500, f"Seed failed: {e}")


# ----------------------- Admin product image upload -----------------------
@api_router.get("/admin/me")
async def admin_me(admin: Dict[str, Any] = Depends(require_admin)):
    """Backend-verified admin identity. The frontend's RequireAdmin guard
    calls this on mount so role is never trusted from client state alone."""
    return {"ok": True, "user_id": admin["user_id"], "email": admin["email"]}


# ----------------------- Admin push notifications -----------------------
class FcmTokenIn(BaseModel):
    token: str = Field(..., min_length=10, max_length=400)
    platform: str = Field("android", min_length=2, max_length=10)
    device_label: Optional[str] = Field(None, max_length=80)


@api_router.post("/admin/fcm-token")
async def register_admin_fcm_token(
    body: FcmTokenIn,
    admin: Dict[str, Any] = Depends(require_admin),
):
    """Admin app calls this on login + every time the FCM token rotates."""
    plat = body.platform.lower().strip()
    if plat not in {"android", "ios", "web"}:
        plat = "android"
    try:
        sb.table("admin_fcm_tokens").upsert({
            "user_id": admin["user_id"],
            "token": body.token,
            "platform": plat,
            "device_label": body.device_label,
        }, on_conflict="token").execute()
        return {"ok": True}
    except Exception as e:
        logging.exception("admin fcm token register failed")
        raise HTTPException(500, f"Could not save token: {e}")


@api_router.delete("/admin/fcm-token")
async def unregister_admin_fcm_token(
    token: str,
    admin: Dict[str, Any] = Depends(require_admin),
):
    try:
        sb.table("admin_fcm_tokens").delete().eq(
            "user_id", admin["user_id"]
        ).eq("token", token).execute()
        return {"ok": True}
    except Exception as e:
        logging.exception("admin fcm token unregister failed")
        return {"ok": False, "error": str(e)}


def _all_admin_fcm_tokens() -> List[str]:
    try:
        res = sb.table("admin_fcm_tokens").select("token").execute()
        return [r["token"] for r in (res.data or []) if r.get("token")]
    except Exception as e:
        logging.warning("could not load admin fcm tokens: %s", e)
        return []


def _delete_admin_tokens(tokens: List[str]) -> None:
    if not tokens:
        return
    try:
        sb.table("admin_fcm_tokens").delete().in_("token", tokens).execute()
    except Exception as e:
        logging.warning("could not gc invalid admin tokens: %s", e)


def notify_admins_new_order(order_row: Optional[Dict[str, Any]]) -> None:
    """Broadcast a 'new order' push to every admin device. Best-effort."""
    if not order_row:
        return
    try:
        tokens = _all_admin_fcm_tokens()
        if not tokens:
            return
        name = order_row.get("customer_name") or "A customer"
        amount = order_row.get("total_amount") or 0
        try:
            amount_str = f"₹{float(amount):.0f}"
        except Exception:
            amount_str = f"₹{amount}"
        result = admin_push.send_to_tokens(
            tokens=tokens,
            title="New order received",
            body=f"{name} placed an order — {amount_str}",
            data={
                "type": "new_order",
                "order_id": str(order_row.get("id") or ""),
                "amount": str(amount),
            },
        )
        _delete_admin_tokens(result.get("invalid_tokens") or [])
        if result.get("skipped"):
            logging.info("admin push skipped: %s", result.get("reason"))
        else:
            logging.info("admin push: success=%d failure=%d",
                         result.get("success_count", 0),
                         result.get("failure_count", 0))
    except Exception as e:
        logging.warning("notify_admins_new_order failed: %s", e)


@api_router.get("/admin/orders")
async def admin_orders(
    limit: int = 50,
    status: Optional[str] = None,
    admin: Dict[str, Any] = Depends(require_admin),
):
    """List recent orders for admin dashboard. Newest first."""
    limit = max(1, min(int(limit), 200))
    try:
        q = sb.table("orders").select("*").order("created_at", desc=True).limit(limit)
        if status:
            q = q.eq("payment_status", status)
        res = q.execute()
        return {"orders": res.data or []}
    except Exception as e:
        logging.exception("admin orders fetch failed")
        raise HTTPException(500, f"Could not load orders: {e}")


class AdminOrderStatusIn(BaseModel):
    status: str = Field(..., min_length=2, max_length=30)


@api_router.patch("/admin/orders/{order_id}")
async def admin_update_order_status(
    order_id: str,
    body: AdminOrderStatusIn,
    admin: Dict[str, Any] = Depends(require_admin),
):
    allowed = {"cod_pending", "paid", "preparing", "ready",
               "out_for_delivery", "delivered", "cancelled"}
    if body.status not in allowed:
        raise HTTPException(400, f"Invalid status (must be one of {sorted(allowed)})")
    try:
        res = sb.table("orders").update({
            "payment_status": body.status,
        }).eq("id", order_id).execute()
        if not res.data:
            raise HTTPException(404, "Order not found")
        return {"ok": True, "order": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("admin order status update failed")
        raise HTTPException(500, f"Could not update status: {e}")


@api_router.post("/admin/upload-product-image")
async def upload_product_image(
    product_id: str = Form(...),
    admin_token: str = Form(...),
    file: UploadFile = File(...),
):
    """Verify Supabase access token, upload file to product-images bucket, update products.image_url."""
    # Verify admin role via the shared guard. We accept the token in the form
    # body for multipart-form compatibility (browsers can't easily set custom
    # headers on <form> file uploads).
    try:
        require_admin(authorization=f"Bearer {admin_token}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(401, f"Auth failed: {e}")

    # Upload to Supabase Storage
    try:
        contents = await file.read()
        ext = (file.filename or "img").rsplit(".", 1)[-1].lower() or "jpg"
        path = f"{product_id}-{uuid.uuid4().hex[:8]}.{ext}"
        sb.storage.from_("product-images").upload(
            path=path,
            file=contents,
            file_options={"content-type": file.content_type or "image/jpeg", "upsert": "true"},
        )
        public_url = sb.storage.from_("product-images").get_public_url(path)
        sb.table("products").update({"image_url": public_url}).eq("id", product_id).execute()
        return {"ok": True, "image_url": public_url}
    except Exception as e:
        logging.exception("upload failed")
        raise HTTPException(500, f"Upload failed: {e}")


# ----------------------- Customer Auth (Google via Emergent) -----------------------
import bcrypt
import secrets
import asyncio
import resend
EMERGENT_AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
SESSION_COOKIE_NAME = "session_token"
SESSION_TTL_DAYS = 7
SESSION_TTL_REMEMBER_DAYS = 90
LOCKOUT_THRESHOLD = 5
LOCKOUT_MINUTES = 15
PASSWORD_RESET_TTL_MINUTES = 60

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

# Configure Resend at module load. Missing key → forgot-password becomes a no-op.
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


def _frontend_origin(request: Request) -> str:
    """Decide which origin to put in reset-password emails. Prefer the
    explicit FRONTEND_URL env var (production deploy), fall back to the
    request Origin header (works on preview)."""
    explicit = os.environ.get("FRONTEND_URL", "").strip().rstrip("/")
    if explicit:
        return explicit
    origin = request.headers.get("origin", "").strip().rstrip("/")
    if origin:
        return origin
    return "https://karthikachickencentre.shop"


def _password_reset_email_html(name: str, reset_url: str) -> str:
    """Inline-CSS, table-based HTML for max email-client compatibility."""
    safe_name = (name or "there").replace("<", "").replace(">", "")[:60]
    return (
        '<!doctype html><html><body style="margin:0;padding:0;background:#F5F5F5;'
        'font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#212121;">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        'style="background:#F5F5F5;padding:32px 16px;">'
        '<tr><td align="center">'
        '<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" '
        'style="background:#FFFFFF;border:1px solid #E0E0E0;border-radius:12px;max-width:560px;width:100%;">'
        '<tr><td style="padding:32px 32px 8px 32px;">'
        '<div style="font-size:13px;letter-spacing:.18em;color:#D32F2F;font-weight:700;">CHICKENCREW</div>'
        '<h1 style="margin:8px 0 0 0;font-size:22px;color:#212121;">Reset your password</h1>'
        '</td></tr>'
        '<tr><td style="padding:8px 32px 16px 32px;font-size:15px;line-height:1.55;color:#212121;">'
        f'Hi {safe_name},<br><br>'
        'We received a request to reset your ChickenCrew password. Tap the button below to set a new one. '
        'This link is valid for 60 minutes.'
        '</td></tr>'
        '<tr><td style="padding:8px 32px 24px 32px;">'
        f'<a href="{reset_url}" target="_blank" '
        'style="display:inline-block;padding:14px 28px;background:#D32F2F;color:#FFFFFF;'
        'border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Reset password</a>'
        '</td></tr>'
        '<tr><td style="padding:0 32px 24px 32px;font-size:13px;color:#616161;line-height:1.55;">'
        'If the button doesn\'t work, copy and paste this URL into your browser:<br>'
        f'<a href="{reset_url}" style="color:#D32F2F;word-break:break-all;">{reset_url}</a>'
        '</td></tr>'
        '<tr><td style="padding:16px 32px 32px 32px;font-size:12px;color:#616161;border-top:1px solid #F5F5F5;">'
        'Didn\'t request this? You can safely ignore this email — your password will stay the same.'
        '</td></tr>'
        '</table>'
        '<div style="margin-top:16px;font-size:11px;color:#616161;">'
        '© ChickenCrew · Fresh chicken delivered to your door'
        '</div>'
        '</td></tr></table></body></html>'
    )


async def _send_password_reset_email(to_email: str, name: str, reset_url: str) -> None:
    """Fire-and-forget Resend send. Logs but never raises so we don't leak
    whether an email was actually sent."""
    if not RESEND_API_KEY:
        logging.warning("RESEND_API_KEY missing — would send reset email to %s", to_email)
        logging.warning("Reset URL (DEV ONLY): %s", reset_url)
        return
    params = {
        "from": f"ChickenCrew <{SENDER_EMAIL}>",
        "to": [to_email],
        "subject": "Reset your ChickenCrew password",
        "html": _password_reset_email_html(name, reset_url),
    }
    try:
        resp = await asyncio.to_thread(resend.Emails.send, params)
        logging.info("Password reset email queued for %s (id=%s)", to_email, (resp or {}).get("id"))
    except Exception as e:
        logging.warning("Resend send failed for %s: %s", to_email, e)


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _issue_customer_session(
    email: str,
    name: Optional[str],
    picture: Optional[str],
    phone: Optional[str],
    *,
    role: str = "customer",
    remember_me: bool = False,
) -> Dict[str, Any]:
    """Create a user_sessions row and return (token, expires_at) — shared by
    both the Google OAuth flow and the email/password flow."""
    ttl_days = SESSION_TTL_REMEMBER_DAYS if remember_me else SESSION_TTL_DAYS
    expires_at = datetime.now(timezone.utc) + timedelta(days=ttl_days)
    token = secrets.token_urlsafe(48)
    sb.table("user_sessions").insert({
        "session_token": token,
        "email": email.lower(),
        "name": sanitize_text(name or "", 80),
        "picture": picture[:500] if picture else None,
        "phone": phone,
        "role": role,
        "remember_me": remember_me,
        "expires_at": expires_at.isoformat(),
        "last_seen_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    return {"token": token, "expires_at": expires_at, "ttl_days": ttl_days}


def _bearer_or_cookie(request: Request, authorization: Optional[str]) -> Optional[str]:
    """Return the session token from cookie OR Authorization header."""
    cookie_tok = request.cookies.get(SESSION_COOKIE_NAME)
    if cookie_tok:
        return cookie_tok
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip() or None
    return None


def require_customer(request: Request, authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """FastAPI dependency: validates the customer session_token from cookie/header.
    Returns the user_sessions row dict. Raises 401 if invalid/expired."""
    token = _bearer_or_cookie(request, authorization)
    if not token:
        raise HTTPException(401, "Not signed in")
    try:
        res = sb.table("user_sessions").select(
            "id, session_token, email, name, picture, phone, role, expires_at"
        ).eq("session_token", token).limit(1).execute()
        row = res.data[0] if res.data else None
    except Exception as e:
        logging.warning("session lookup failed: %s", e)
        raise HTTPException(500, "Session lookup failed")
    if not row:
        raise HTTPException(401, "Invalid session")
    # Validate expiry (Supabase returns ISO string)
    expires_raw = row.get("expires_at")
    try:
        expires_at = datetime.fromisoformat(expires_raw.replace("Z", "+00:00")) \
            if isinstance(expires_raw, str) else expires_raw
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(401, "Session expired")
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(401, "Session expired")
    # Touch last_seen_at (best-effort, don't fail the request)
    try:
        sb.table("user_sessions").update(
            {"last_seen_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", row["id"]).execute()
    except Exception:
        pass
    return row


class GoogleSessionIn(BaseModel):
    session_id: str = Field(..., min_length=10, max_length=200)


@api_router.post("/auth/google/session")
async def auth_google_session(payload: GoogleSessionIn, request: Request):
    """Exchange Emergent Google `session_id` (URL fragment) for a server-issued
    `session_token`. Sets an httpOnly cookie AND returns the token in JSON so
    Capacitor WebView (no third-party cookies) can use the Authorization header.
    """
    # Call Emergent's session-data endpoint server-to-server (never from FE)
    try:
        import urllib.request
        import json as _json
        req = urllib.request.Request(
            EMERGENT_AUTH_SESSION_URL,
            headers={"X-Session-ID": payload.session_id},
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = _json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        logging.warning("emergent session-data fetch failed: %s", e)
        raise HTTPException(401, "Could not verify Google session")
    email = (data or {}).get("email")
    name = (data or {}).get("name") or ""
    picture = (data or {}).get("picture") or ""
    session_token = (data or {}).get("session_token")
    if not email or not session_token:
        raise HTTPException(401, "Invalid Google session payload")
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)
    # Look up existing phone link by email (so user doesn't relink each session)
    linked_phone = None
    try:
        existing = sb.table("customer_profiles").select("phone").eq(
            "email", email
        ).limit(1).execute()
        if existing.data:
            linked_phone = existing.data[0].get("phone")
    except Exception as e:
        logging.warning("email->phone lookup failed: %s", e)
    # Persist session row (upsert by session_token)
    try:
        sb.table("user_sessions").upsert({
            "session_token": session_token,
            "email": email,
            "name": sanitize_text(name, 80),
            "picture": picture[:500] if picture else None,
            "phone": linked_phone,
            "expires_at": expires_at.isoformat(),
            "last_seen_at": datetime.now(timezone.utc).isoformat(),
        }, on_conflict="session_token").execute()
    except Exception as e:
        logging.exception("session insert failed")
        raise HTTPException(500, f"Session save failed: {e}")
    response = JSONResponse({
        "ok": True,
        "user": {
            "email": email,
            "name": name,
            "picture": picture,
            "phone": linked_phone,
        },
        "session_token": session_token,
    })
    # httpOnly cookie for browser flows
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        max_age=SESSION_TTL_DAYS * 24 * 3600,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    return response


@api_router.post("/auth/google/idtoken")
async def auth_google_idtoken(request: Request):
    """Mobile-native Google sign-in.

    The Flutter app uses `google_sign_in` to obtain a Google ID token,
    then POSTs it here. We verify the ID token against Google's public
    keys (via `google.oauth2.id_token.verify_oauth2_token`), match the
    audience to our OAuth Web Client ID, and — on success — mint a
    server-side `session_token` (same shape used by /auth/login and
    /auth/google/session).

    The website continues to use /auth/google/session (Emergent-managed
    redirect flow). Both flows write to the same `user_sessions` table.

    Body:
        {"id_token": "<google-id-token>", "remember_me": false}

    Returns:
        {"ok": true, "user": {email, name, picture, phone}, "session_token": "..."}
    """
    # Lazy-import the verifier so a stale install doesn't break unrelated routes.
    from google.oauth2 import id_token as g_id_token  # type: ignore
    from google.auth.transport import requests as g_requests  # type: ignore

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON body")
    raw_token = (body.get("id_token") or "").strip() if isinstance(body, dict) else ""
    remember_me = bool(body.get("remember_me", False)) if isinstance(body, dict) else False
    if not raw_token:
        raise HTTPException(400, "id_token is required")

    audience = "929626564461-5vqfvp3qes9fg3i8acfuvhivt847i07e.apps.googleusercontent.com"
    try:
        # `verify_oauth2_token` checks signature, issuer, expiry, and audience.
        # `clock_skew_in_seconds=10` matches the Flutter google_sign_in SDK's
        # default tolerance and avoids spurious failures from clock drift.
        claims = g_id_token.verify_oauth2_token(
            raw_token,
            g_requests.Request(),
            audience,
            clock_skew_in_seconds=10,
        )
    except ValueError as e:
        # Includes signature mismatch, expired token, wrong audience, etc.
        logging.info("google idtoken verify failed: %s", e)
        raise HTTPException(401, "Invalid Google ID token")
    except Exception as e:
        logging.warning("google idtoken verify error: %s", e)
        raise HTTPException(401, "Invalid Google ID token")

    # Belt-and-braces audience check (verify_oauth2_token already does this,
    # but if anyone changes the kwargs above this guard still holds).
    if claims.get("aud") != audience:
        raise HTTPException(401, "Token audience mismatch")
    if not claims.get("email_verified"):
        raise HTTPException(401, "Email is not verified")

    email = (claims.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(401, "Token missing email claim")
    name = claims.get("name") or claims.get("given_name") or ""
    picture = claims.get("picture")

    # Look up linked phone from customer_profiles so the mobile UI can
    # show order history immediately without a follow-up `/customer/profile`
    # round-trip on first launch.
    phone: Optional[str] = None
    try:
        prof = sb.table("customer_profiles").select("phone").eq(
            "email", email
        ).limit(1).execute()
        if prof.data:
            phone = prof.data[0].get("phone")
    except Exception as e:
        logging.warning("customer_profiles lookup failed: %s", e)

    # Mint session_token (also writes to user_sessions).
    sess = _issue_customer_session(
        email=email,
        name=name,
        picture=picture,
        phone=phone,
        role="customer",
        remember_me=remember_me,
    )

    response = JSONResponse({
        "ok": True,
        "user": {
            "email": email,
            "name": name,
            "picture": picture,
            "phone": phone,
        },
        "session_token": sess["token"],
    })
    # Browsers also get the cookie (so a desktop browser hitting this
    # endpoint stays signed in across reloads). Mobile clients just
    # ignore it and read `session_token` from the JSON body.
    _set_session_cookie(response, sess["token"], sess["ttl_days"])
    return response


@api_router.get("/auth/me")
async def auth_me(user=Depends(require_customer)):
    return {
        "email": user["email"],
        "name": user.get("name"),
        "picture": user.get("picture"),
        "phone": user.get("phone"),
        "role": user.get("role") or "customer",
    }


@api_router.post("/auth/logout")
async def auth_logout(request: Request, authorization: Optional[str] = Header(None)):
    token = _bearer_or_cookie(request, authorization)
    if token:
        try:
            sb.table("user_sessions").delete().eq("session_token", token).execute()
        except Exception as e:
            logging.warning("session delete failed: %s", e)
    response = JSONResponse({"ok": True})
    response.delete_cookie(SESSION_COOKIE_NAME, path="/", samesite="none", secure=True)
    return response


# ----------------------- Email/Password Auth -----------------------
class SignupIn(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=1, max_length=80)
    phone: Optional[str] = Field(None, min_length=10, max_length=15)
    remember_me: bool = False


class LoginIn(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=1, max_length=128)
    remember_me: bool = False


def _set_session_cookie(response: JSONResponse, token: str, ttl_days: int) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=ttl_days * 24 * 3600,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )


def _try_admin_login_via_supabase(
    *, email: str, password: str, remember_me: bool
) -> Optional[Dict[str, Any]]:
    """If `email` is a Supabase Auth admin, verify the password against
    Supabase Auth and issue a server-side session_token with role='admin'.

    Returns:
        Dict with keys {token, ttl_days, name} on success, None when this
        email isn't a Supabase admin (so the caller falls through to the
        customer credentials path).

    Never raises 401 — only returns None — so the customer path can still
    take over if the email exists in `customer_credentials`.
    """
    try:
        # Use the anon key client + signInWithPassword (same as the website).
        # If the password is wrong this raises; we catch & return None.
        user_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        auth_res = user_client.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })
    except Exception as e:
        logging.info("supabase admin sign-in failed for %s: %s", email, e)
        return None
    user = getattr(auth_res, "user", None)
    if not user:
        return None
    user_id = user.id
    user_meta = getattr(user, "user_metadata", None) or {}
    full_name = user_meta.get("full_name") or user_meta.get("name") or ""

    # Confirm this user actually has the admin role (defense-in-depth).
    try:
        roles = sb.table("user_roles").select("role").eq(
            "user_id", user_id
        ).eq("role", "admin").limit(1).execute()
        if not roles.data:
            return None  # Valid Supabase user but not an admin → fall through
    except Exception as e:
        logging.warning("admin role check failed: %s", e)
        return None

    # Mint a server-side session_token (same shape used for customers) so
    # the mobile app can hit /api/customer/* + admin endpoints with one
    # Bearer header.
    sess = _issue_customer_session(
        email=email, name=full_name, picture=None, phone=None,
        role="admin", remember_me=remember_me,
    )
    return {**sess, "name": full_name}


@api_router.post("/auth/signup")
async def auth_signup(payload: SignupIn, request: Request):
    email = payload.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "Invalid email")
    if len(payload.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    rate_limit(request, "signup", extra_key=email)
    name = sanitize_text(payload.name, 80)
    # Refuse if already registered
    try:
        existing = sb.table("customer_credentials").select("email").eq(
            "email", email
        ).limit(1).execute()
    except Exception as e:
        raise HTTPException(500, f"Lookup failed: {e}")
    if existing.data:
        raise HTTPException(409, "An account with this email already exists. Try signing in.")
    # Optional phone link at signup — fail fast if it's already taken by another email
    phone = None
    if payload.phone:
        phone = validate_indian_phone(payload.phone)
        try:
            taken = sb.table("customer_profiles").select("email").eq(
                "phone", phone
            ).limit(1).execute()
            if taken.data and taken.data[0].get("email") and taken.data[0]["email"].lower() != email:
                raise HTTPException(409, "This phone is already linked to another account.")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Phone lookup failed: {e}")
    # Persist credential + profile
    try:
        sb.table("customer_credentials").insert({
            "email": email,
            "password_hash": _hash_password(payload.password),
        }).execute()
        if phone:
            # Upsert minimal profile
            sb.table("customer_profiles").upsert({
                "phone": phone,
                "name": name,
                "email": email,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }, on_conflict="phone").execute()
    except Exception as e:
        logging.exception("signup persist failed")
        raise HTTPException(500, f"Could not create account: {e}")
    # Issue session
    sess = _issue_customer_session(
        email=email, name=name, picture=None, phone=phone,
        role="customer", remember_me=payload.remember_me,
    )
    response = JSONResponse({
        "ok": True,
        "user": {"email": email, "name": name, "picture": None, "phone": phone, "role": "customer"},
        "session_token": sess["token"],
    })
    _set_session_cookie(response, sess["token"], sess["ttl_days"])
    return response


@api_router.post("/auth/login")
async def auth_login(payload: LoginIn, request: Request):
    email = payload.email.strip().lower()
    rate_limit(request, "login", extra_key=email)
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "Invalid email")

    # ---- Path 1: Admin login via Supabase Auth -----------------------
    # Admin users live in Supabase's `auth.users` table (managed by the
    # Supabase Auth service), not in `customer_credentials`. Mobile apps
    # can't run the Supabase JS client, so we proxy the password check
    # through Supabase's REST endpoint and, on success, mint our own
    # session_token with role='admin'. This keeps a single login API for
    # both customers and admins.
    admin_session = _try_admin_login_via_supabase(
        email=email,
        password=payload.password,
        remember_me=payload.remember_me,
    )
    if admin_session is not None:
        response = JSONResponse({
            "ok": True,
            "user": {
                "email": email,
                "name": admin_session.get("name") or "",
                "picture": None,
                "phone": None,
                "role": "admin",
            },
            "session_token": admin_session["token"],
        })
        _set_session_cookie(response, admin_session["token"],
                            admin_session["ttl_days"])
        return response

    # ---- Path 2: Customer login via customer_credentials -------------
    try:
        cred_res = sb.table("customer_credentials").select(
            "email, password_hash, failed_attempts, locked_until"
        ).eq("email", email).limit(1).execute()
    except Exception as e:
        raise HTTPException(500, f"Login lookup failed: {e}")
    cred = cred_res.data[0] if cred_res.data else None
    if not cred:
        # Constant-time-ish: still spend time hashing to avoid leaking existence
        _verify_password(payload.password, "$2b$12$abcdefghijklmnopqrstuv0123456789abcdefghijklmnopqrst")
        raise HTTPException(401, "Invalid email or password")
    # Lockout check
    locked = cred.get("locked_until")
    if locked:
        try:
            lock_dt = datetime.fromisoformat(locked.replace("Z", "+00:00")) if isinstance(locked, str) else locked
            if lock_dt.tzinfo is None:
                lock_dt = lock_dt.replace(tzinfo=timezone.utc)
            if lock_dt > datetime.now(timezone.utc):
                raise HTTPException(429, "Too many failed attempts. Try again in 15 minutes.")
        except HTTPException:
            raise
        except Exception:
            pass
    # Verify password
    if not _verify_password(payload.password, cred["password_hash"]):
        attempts = (cred.get("failed_attempts") or 0) + 1
        update = {"failed_attempts": attempts, "updated_at": datetime.now(timezone.utc).isoformat()}
        if attempts >= LOCKOUT_THRESHOLD:
            update["locked_until"] = (
                datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
            ).isoformat()
            update["failed_attempts"] = 0
        try:
            sb.table("customer_credentials").update(update).eq("email", email).execute()
        except Exception:
            pass
        raise HTTPException(401, "Invalid email or password")
    # Reset failed attempts
    try:
        sb.table("customer_credentials").update({
            "failed_attempts": 0, "locked_until": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("email", email).execute()
    except Exception:
        pass
    # Pull associated profile (if any) for name / linked phone
    name, phone = "", None
    try:
        prof = sb.table("customer_profiles").select(
            "name, phone"
        ).eq("email", email).limit(1).execute()
        if prof.data:
            name = prof.data[0].get("name") or ""
            phone = prof.data[0].get("phone")
    except Exception:
        pass
    sess = _issue_customer_session(
        email=email, name=name, picture=None, phone=phone,
        role="customer", remember_me=payload.remember_me,
    )
    response = JSONResponse({
        "ok": True,
        "user": {"email": email, "name": name, "picture": None, "phone": phone, "role": "customer"},
        "session_token": sess["token"],
    })
    _set_session_cookie(response, sess["token"], sess["ttl_days"])
    return response


# ----- Forgot / reset password -----
class ForgotPasswordIn(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)


class ResetPasswordIn(BaseModel):
    token: str = Field(..., min_length=20, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)


@api_router.post("/auth/forgot-password")
async def auth_forgot_password(payload: ForgotPasswordIn, request: Request):
    """Issues a 1-hour reset token and emails it via Resend.
    ALWAYS returns 200 (security: don't leak which emails are registered)."""
    email = payload.email.strip().lower()
    rate_limit(request, "forgot_password", extra_key=email)
    # Hide existence: only proceed silently if account exists
    if not EMAIL_RE.match(email):
        return {"ok": True}
    try:
        cred_res = sb.table("customer_credentials").select("email").eq(
            "email", email
        ).limit(1).execute()
    except Exception:
        return {"ok": True}
    if not cred_res.data:
        return {"ok": True}
    # Pull name for personalization (best-effort)
    name = ""
    try:
        prof = sb.table("customer_profiles").select("name").eq(
            "email", email
        ).limit(1).execute()
        if prof.data:
            name = prof.data[0].get("name") or ""
    except Exception:
        pass
    token = secrets.token_urlsafe(40)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_TTL_MINUTES)
    try:
        sb.table("password_reset_tokens").insert({
            "token": token,
            "email": email,
            "expires_at": expires_at.isoformat(),
        }).execute()
    except Exception as e:
        logging.exception("password_reset_tokens insert failed")
        return {"ok": True}
    reset_url = f"{_frontend_origin(request)}/auth/reset?token={token}"
    await _send_password_reset_email(to_email=email, name=name, reset_url=reset_url)
    return {"ok": True}


@api_router.post("/auth/reset-password")
async def auth_reset_password(payload: ResetPasswordIn, request: Request):
    """Verifies the reset token, updates password_hash, marks token used."""
    if len(payload.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    try:
        res = sb.table("password_reset_tokens").select(
            "token, email, expires_at, used_at"
        ).eq("token", payload.token).limit(1).execute()
    except Exception as e:
        raise HTTPException(500, f"Lookup failed: {e}")
    row = res.data[0] if res.data else None
    if not row:
        raise HTTPException(400, "This link is invalid or has expired. Request a new one.")
    if row.get("used_at"):
        raise HTTPException(400, "This reset link was already used. Request a new one.")
    expires_raw = row.get("expires_at")
    try:
        exp = datetime.fromisoformat(expires_raw.replace("Z", "+00:00")) \
            if isinstance(expires_raw, str) else expires_raw
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(400, "This link has expired. Request a new one.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, "This link is invalid. Request a new one.")
    email = row["email"]
    new_hash = _hash_password(payload.password)
    try:
        sb.table("customer_credentials").update({
            "password_hash": new_hash,
            "failed_attempts": 0,
            "locked_until": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("email", email).execute()
        sb.table("password_reset_tokens").update({
            "used_at": datetime.now(timezone.utc).isoformat()
        }).eq("token", payload.token).execute()
        # Invalidate every active session for that email — force re-login.
        sb.table("user_sessions").delete().eq("email", email).execute()
    except Exception as e:
        logging.exception("reset password persist failed")
        raise HTTPException(500, f"Could not reset password: {e}")
    return {"ok": True}


# ----------------------- Customer profile + addresses + orders -----------------------
class LinkPhoneIn(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)


@api_router.post("/customer/link-phone")
async def link_phone(payload: LinkPhoneIn, request: Request, user=Depends(require_customer)):
    """Link a 10-digit phone to the signed-in Google account.
    Trust model (V1): no OTP. Cap to 1 email per phone and 1 phone per email
    (uniqueness enforced by Postgres). Idempotent — same email→phone is a no-op.
    """
    phone = validate_indian_phone(payload.phone)
    rate_limit(request, "profile_lookup", extra_key=user["email"])
    # If already linked, just return current state
    if user.get("phone") == phone:
        return {"ok": True, "phone": phone, "already_linked": True}
    # Refuse if this phone is already linked to a different email
    try:
        existing = sb.table("customer_profiles").select("email, phone, name").eq(
            "phone", phone
        ).limit(1).execute()
    except Exception as e:
        raise HTTPException(500, f"Lookup failed: {e}")
    existing_row = existing.data[0] if existing.data else None
    if existing_row and existing_row.get("email") and existing_row.get("email") != user["email"]:
        raise HTTPException(409, "This phone is already linked to a different account.")
    # Refuse if this email is already linked to a different phone
    try:
        prior = sb.table("customer_profiles").select("phone").eq(
            "email", user["email"]
        ).limit(1).execute()
        if prior.data and prior.data[0].get("phone") and prior.data[0].get("phone") != phone:
            raise HTTPException(409, "Your account is already linked to a different phone.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Lookup failed: {e}")
    # Upsert profile row with email link
    try:
        if existing_row:
            sb.table("customer_profiles").update({
                "email": user["email"],
                "name": existing_row.get("name") or user.get("name") or "",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("phone", phone).execute()
        else:
            sb.table("customer_profiles").upsert({
                "phone": phone,
                "name": user.get("name") or "",
                "email": user["email"],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }, on_conflict="phone").execute()
    except Exception as e:
        logging.exception("link-phone profile upsert failed")
        raise HTTPException(500, f"Could not link phone: {e}")
    # Update session row so subsequent calls have phone available
    try:
        sb.table("user_sessions").update({"phone": phone}).eq("id", user["id"]).execute()
    except Exception as e:
        logging.warning("session phone update failed: %s", e)
    return {"ok": True, "phone": phone}


@api_router.get("/customer/profile")
async def customer_profile(user=Depends(require_customer)):
    """Returns Google identity + linked phone + customer_profiles row (if linked)."""
    profile = None
    if user.get("phone"):
        try:
            res = sb.table("customer_profiles").select(
                "phone, name, address, lat, lng, email, updated_at"
            ).eq("phone", user["phone"]).limit(1).execute()
            profile = res.data[0] if res.data else None
        except Exception as e:
            logging.warning("profile fetch failed: %s", e)
    return {
        "auth": {
            "email": user["email"],
            "name": user.get("name"),
            "picture": user.get("picture"),
            "phone": user.get("phone"),
        },
        "profile": profile,
    }


class UpdateProfileIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)


@api_router.put("/customer/profile")
async def update_profile(payload: UpdateProfileIn, user=Depends(require_customer)):
    if not user.get("phone"):
        raise HTTPException(400, "Link a phone first")
    name = sanitize_text(payload.name, 80)
    try:
        sb.table("customer_profiles").update({
            "name": name,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("phone", user["phone"]).execute()
    except Exception as e:
        raise HTTPException(500, f"Update failed: {e}")
    return {"ok": True, "name": name}


# ----- Addresses -----
class AddressIn(BaseModel):
    label: str = Field("Home", min_length=1, max_length=20)
    address: str = Field(..., min_length=5, max_length=400)
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)
    is_default: bool = False


@api_router.get("/customer/addresses")
async def list_addresses(user=Depends(require_customer)):
    if not user.get("phone"):
        return {"addresses": []}
    try:
        res = sb.table("customer_addresses").select(
            "id, label, address, lat, lng, is_default, created_at"
        ).eq("phone", user["phone"]).order("is_default", desc=True).order(
            "created_at", desc=True
        ).execute()
        return {"addresses": res.data or []}
    except Exception as e:
        raise HTTPException(500, f"List failed: {e}")


@api_router.post("/customer/addresses")
async def create_address(payload: AddressIn, user=Depends(require_customer)):
    if not user.get("phone"):
        raise HTTPException(400, "Link a phone first")
    try:
        # If first address, force is_default = true
        existing = sb.table("customer_addresses").select(
            "id", count="exact"
        ).eq("phone", user["phone"]).execute()
        first = (existing.count or 0) == 0
        row = {
            "phone": user["phone"],
            "label": sanitize_text(payload.label, 20),
            "address": sanitize_text(payload.address, 400),
            "lat": payload.lat,
            "lng": payload.lng,
            "is_default": True if first else payload.is_default,
        }
        ins = sb.table("customer_addresses").insert(row).execute()
        return {"ok": True, "address": ins.data[0] if ins.data else None}
    except Exception as e:
        raise HTTPException(500, f"Create failed: {e}")


@api_router.put("/customer/addresses/{address_id}")
async def update_address(address_id: str, payload: AddressIn, user=Depends(require_customer)):
    if not user.get("phone"):
        raise HTTPException(400, "Link a phone first")
    try:
        # Ownership check
        owner = sb.table("customer_addresses").select("id").eq(
            "id", address_id
        ).eq("phone", user["phone"]).limit(1).execute()
        if not owner.data:
            raise HTTPException(404, "Address not found")
        sb.table("customer_addresses").update({
            "label": sanitize_text(payload.label, 20),
            "address": sanitize_text(payload.address, 400),
            "lat": payload.lat,
            "lng": payload.lng,
            "is_default": payload.is_default,
        }).eq("id", address_id).execute()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Update failed: {e}")


@api_router.delete("/customer/addresses/{address_id}")
async def delete_address(address_id: str, user=Depends(require_customer)):
    if not user.get("phone"):
        raise HTTPException(400, "Link a phone first")
    try:
        owner = sb.table("customer_addresses").select("id, is_default").eq(
            "id", address_id
        ).eq("phone", user["phone"]).limit(1).execute()
        if not owner.data:
            raise HTTPException(404, "Address not found")
        sb.table("customer_addresses").delete().eq("id", address_id).execute()
        # If we deleted the default, promote the most recent remaining one
        if owner.data[0].get("is_default"):
            rem = sb.table("customer_addresses").select("id").eq(
                "phone", user["phone"]
            ).order("created_at", desc=True).limit(1).execute()
            if rem.data:
                sb.table("customer_addresses").update(
                    {"is_default": True}
                ).eq("id", rem.data[0]["id"]).execute()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Delete failed: {e}")


# ----- Orders (history + cancel + reorder) -----
# Map UI status tabs → underlying order statuses
ONGOING_STATUSES = {"cod_pending", "paid", "preparing", "out_for_delivery", "ready"}
DELIVERED_STATUSES = {"delivered", "completed"}
CANCELLED_STATUSES = {"cancelled", "canceled", "rejected"}


@api_router.get("/customer/orders")
async def customer_orders(status: Optional[str] = None, user=Depends(require_customer)):
    """Returns orders for the linked phone, optionally filtered by tab status."""
    if not user.get("phone"):
        return {"orders": []}
    try:
        q = sb.table("orders").select(
            "id, customer_name, customer_phone, customer_address, items, total_amount, "
            "payment_status, notes, created_at, delivery_slot_date, delivery_slot_start, "
            "delivery_slot_end, cancelled_at, cancelled_by"
        ).eq("customer_phone", user["phone"]).order("created_at", desc=True).limit(50)
        res = q.execute()
        orders = res.data or []
    except Exception as e:
        raise HTTPException(500, f"List failed: {e}")
    if status == "ongoing":
        orders = [o for o in orders if (o.get("payment_status") or "").lower() in ONGOING_STATUSES]
    elif status == "delivered":
        orders = [o for o in orders if (o.get("payment_status") or "").lower() in DELIVERED_STATUSES]
    elif status == "cancelled":
        orders = [o for o in orders if (o.get("payment_status") or "").lower() in CANCELLED_STATUSES]
    return {"orders": orders}


@api_router.get("/customer/orders/{order_id}")
async def customer_order_detail(order_id: str, user=Depends(require_customer)):
    """Single order lookup for the mobile 'Track this order' screen.

    Returns the order if and only if it belongs to the authenticated
    customer. Phone match is normalized (digits only, 10-digit suffix)
    to handle stored variations like '+919619417452', '919619417452',
    or '9619417452' all matching the same user.

    404 → order doesn't exist OR doesn't belong to this user (we don't
    distinguish, to avoid leaking which IDs exist).
    """
    if not user.get("phone"):
        raise HTTPException(400, "Link a phone first")
    try:
        res = sb.table("orders").select(
            "id, customer_name, customer_phone, customer_address, items, total_amount, "
            "payment_status, notes, created_at, delivery_slot_date, delivery_slot_start, "
            "delivery_slot_end, cancelled_at, cancelled_by"
        ).eq("id", order_id).limit(1).execute()
    except Exception as e:
        raise HTTPException(500, f"Lookup failed: {e}")
    row = res.data[0] if res.data else None
    if not row:
        raise HTTPException(404, "Order not found")
    # Normalize both sides to the last 10 digits before comparing.
    def _last10(s: str) -> str:
        digits = "".join(ch for ch in (s or "") if ch.isdigit())
        return digits[-10:] if len(digits) >= 10 else digits
    if _last10(row.get("customer_phone", "")) != _last10(user["phone"]):
        raise HTTPException(404, "Order not found")
    return {"order": row}


class CancelOrderIn(BaseModel):
    reason: Optional[str] = Field(None, max_length=200)


@api_router.post("/customer/orders/{order_id}/cancel")
async def cancel_order(order_id: str, payload: CancelOrderIn, user=Depends(require_customer)):
    """Customer cancels their own pending order. Only `cod_pending` orders
    that haven't been picked up yet can be cancelled."""
    if not user.get("phone"):
        raise HTTPException(400, "Link a phone first")
    try:
        res = sb.table("orders").select(
            "id, customer_phone, payment_status"
        ).eq("id", order_id).limit(1).execute()
    except Exception as e:
        raise HTTPException(500, f"Lookup failed: {e}")
    row = res.data[0] if res.data else None
    if not row:
        raise HTTPException(404, "Order not found")
    if row.get("customer_phone") != user["phone"]:
        raise HTTPException(403, "Not your order")
    current = (row.get("payment_status") or "").lower()
    if current not in {"cod_pending", "paid", "preparing", "ready"}:
        raise HTTPException(400, f"Cannot cancel an order in status '{current}'")
    try:
        sb.table("orders").update({
            "payment_status": "cancelled",
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "cancelled_by": "customer",
            "cancel_reason": sanitize_text(payload.reason or "", 200) or None,
        }).eq("id", order_id).execute()
    except Exception as e:
        raise HTTPException(500, f"Cancel failed: {e}")
    return {"ok": True}


# ----------------------- Wire up -----------------------
app.include_router(api_router)

# Tightened CORS: only the production domain + Vercel preview URLs +
# Capacitor native app + local dev. Anything else is rejected.
# Override via CORS_ORIGINS env var (comma-separated) for new deployments.
_default_origins = [
    "https://karthikachickencentre.shop",
    "https://www.karthikachickencentre.shop",
    "capacitor://localhost",        # Android/iOS native app
    "http://localhost:3000",        # local dev
    "http://localhost:8081",        # local dev (alt port)
]
_env_origins = [o.strip() for o in (os.environ.get("CORS_ORIGINS") or "").split(",") if o.strip()]
ALLOWED_ORIGINS = _env_origins or _default_origins

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    # Also allow any *.vercel.app preview deploy and any *.preview.emergentagent.com
    allow_origin_regex=r"https://[a-z0-9-]+\.(vercel\.app|preview\.emergentagent\.com)$",
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
