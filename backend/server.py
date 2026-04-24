from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File, Form
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
import time
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict


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

# ----------------------- Models -----------------------
class CartItem(BaseModel):
    product_id: str
    name: str
    qty: float
    price: float


class CreateOrderIn(BaseModel):
    customer_name: str
    customer_phone: str
    customer_address: Optional[str] = ""
    delivery_lat: Optional[float] = None
    delivery_lng: Optional[float] = None
    items: List[CartItem]
    total_amount: float
    notes: Optional[str] = ""


class VerifyPaymentIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    local_order_id: str  # client-generated uuid to tie front/back


class RiderLoginIn(BaseModel):
    passcode: str


class OrderStatusIn(BaseModel):
    payment_status: str  # 'paid', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'


# Simple in-memory order draft store (order_id -> draft)
ORDER_DRAFTS: Dict[str, dict] = {}


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
async def get_products():
    """Returns active products joined with today's daily price (if any)."""
    try:
        products = sb.table("products").select(
            "id, name, description, image_url, unit, sort_order, is_active"
        ).eq("is_active", True).order("sort_order").execute()

        prices = sb.table("daily_prices").select(
            "product_id, price_per_unit, price_date"
        ).eq("price_date", "today").execute()
        # Supabase doesn't support 'today' literal; use current date instead
    except Exception:
        pass

    # Re-query prices correctly
    try:
        from datetime import date
        today = date.today().isoformat()
        prices = sb.table("daily_prices").select(
            "product_id, price_per_unit, price_date"
        ).eq("price_date", today).execute()
        price_map = {p["product_id"]: float(p["price_per_unit"]) for p in (prices.data or [])}

        # Also fetch latest price if no row for today (fallback)
        if not price_map:
            all_prices = sb.table("daily_prices").select(
                "product_id, price_per_unit, price_date"
            ).order("price_date", desc=True).execute()
            seen = set()
            for p in (all_prices.data or []):
                if p["product_id"] in seen:
                    continue
                seen.add(p["product_id"])
                price_map[p["product_id"]] = float(p["price_per_unit"])

        out = []
        for p in (products.data or []):
            out.append({
                **p,
                "price": price_map.get(p["id"]),
            })
        return {"products": out, "date": today}
    except Exception as e:
        logging.exception("products fetch failed")
        raise HTTPException(500, f"Failed to fetch products: {e}")


# ----------------------- Razorpay payment -----------------------
@api_router.post("/payments/create-order")
async def create_payment_order(payload: CreateOrderIn):
    """Create a Razorpay order and remember the draft locally until verify."""
    if payload.total_amount <= 0 or not payload.items:
        raise HTTPException(400, "Empty cart")
    try:
        amount_paise = int(round(payload.total_amount * 100))
        receipt = f"fc_{uuid.uuid4().hex[:12]}"
        rzp_order = rzp_client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
        })
        local_id = str(uuid.uuid4())
        ORDER_DRAFTS[local_id] = {
            "rzp_order_id": rzp_order["id"],
            "draft": payload.dict(),
        }
        return {
            "local_order_id": local_id,
            "razorpay_order_id": rzp_order["id"],
            "razorpay_key_id": RAZORPAY_KEY_ID,
            "amount": amount_paise,
            "currency": "INR",
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
        res = sb.table("orders").insert(insert_payload).execute()
        order_row = res.data[0] if res.data else None
        # Clean up draft
        ORDER_DRAFTS.pop(body.local_order_id, None)
        return {"ok": True, "order": order_row}
    except Exception as e:
        logging.exception("order insert failed")
        raise HTTPException(500, f"Could not save order: {e}")


@api_router.post("/orders/cod")
async def create_cod_order(payload: CreateOrderIn):
    """Cash-on-delivery: insert the order directly with payment_status='cod_pending'."""
    if payload.total_amount <= 0 or not payload.items:
        raise HTTPException(400, "Empty cart")
    try:
        insert_payload = {
            "customer_name": payload.customer_name,
            "customer_phone": payload.customer_phone,
            "customer_address": payload.customer_address or None,
            "items": [i.dict() for i in payload.items],
            "total_amount": payload.total_amount,
            "payment_status": "cod_pending",
            "upi_txn_ref": None,
            "notes": payload.notes or None,
            "delivery_lat": payload.delivery_lat,
            "delivery_lng": payload.delivery_lng,
        }
        res = sb.table("orders").insert(insert_payload).execute()
        order_row = res.data[0] if res.data else None
        return {"ok": True, "order": order_row}
    except Exception as e:
        logging.exception("cod order failed")
        raise HTTPException(500, f"Could not save order: {e}")


# ----------------------- Rider -----------------------
@api_router.post("/rider/login")
async def rider_login(body: RiderLoginIn):
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
        ).order("created_at", desc=True).execute()
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
async def seed_admin(body: SeedIn):
    if body.secret != JWT_SECRET:
        raise HTTPException(403, "Forbidden")
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
@api_router.post("/admin/upload-product-image")
async def upload_product_image(
    product_id: str = Form(...),
    admin_token: str = Form(...),
    file: UploadFile = File(...),
):
    """Verify Supabase access token, upload file to product-images bucket, update products.image_url."""
    # Verify admin session by using the access token to query user_roles
    try:
        # Use per-request client with the user's access token to enforce RLS/admin check
        user_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        user_client.postgrest.auth(admin_token)
        user = user_client.auth.get_user(admin_token)
        if not user or not user.user:
            raise HTTPException(401, "Invalid session")
        roles = sb.table("user_roles").select("role").eq(
            "user_id", user.user.id
        ).eq("role", "admin").execute()
        if not roles.data:
            raise HTTPException(403, "Not an admin")
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


# ----------------------- Wire up -----------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
