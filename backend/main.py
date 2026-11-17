import os
import socket
import time
from datetime import datetime
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
INSTANCE_ID = os.getenv("HOSTNAME", socket.gethostname())
SIMULATE_UNREADY = os.getenv("SIMULATE_UNREADY", "false").lower() == "true"
ENABLE_OPS_TOGGLE = os.getenv("ENABLE_OPS_TOGGLE", "true").lower() == "true"
SIMULATE_SLOW_START = os.getenv("SIMULATE_SLOW_START", "false").lower() == "true"
STARTUP_DELAY_SECONDS = float(
    os.getenv("STARTUP_DELAY_SECONDS", "15" if SIMULATE_SLOW_START else "0")
)
STARTED_AT = time.time()

OrderStatus = Literal["Processing", "Shipped", "Delivered", "Delayed"]


class OrderCreate(BaseModel):
    id: Optional[str] = Field(default=None, min_length=1, max_length=32)
    customer: str = Field(..., min_length=1, max_length=120)
    item: str = Field(..., min_length=1, max_length=160)
    status: OrderStatus = "Processing"
    amount: float = Field(..., gt=0)
    currency: str = Field(default="INR", min_length=3, max_length=6)
    tracking: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


app = FastAPI(title="Retail Order Tracking API", version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
    ).split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

ORDERS = [
    {
        "id": "1001",
        "customer": "Aarav Mehta",
        "item": "Everyday Runner Sneakers",
        "status": "Shipped",
        "amount": 4299,
        "currency": "INR",
        "updated": "2026-11-12T10:42:00+05:30",
        "tracking": "NS-TRK-1001",
    },
    {
        "id": "1002",
        "customer": "Diya Reddy",
        "item": "Classic Linen Shirt",
        "status": "Processing",
        "amount": 2199,
        "currency": "INR",
        "updated": "2026-11-12T11:18:00+05:30",
        "tracking": "NS-TRK-1002",
    },
    {
        "id": "1003",
        "customer": "Kabir Shah",
        "item": "Wireless Headphones",
        "status": "Delivered",
        "amount": 6499,
        "currency": "INR",
        "updated": "2026-11-11T16:05:00+05:30",
        "tracking": "NS-TRK-1003",
    },
    {
        "id": "1004",
        "customer": "Ananya Iyer",
        "item": "Minimal Leather Tote",
        "status": "Shipped",
        "amount": 3750,
        "currency": "INR",
        "updated": "2026-11-11T14:31:00+05:30",
        "tracking": "NS-TRK-1004",
    },
    {
        "id": "1005",
        "customer": "Rohan Das",
        "item": "Ceramic Table Lamp",
        "status": "Processing",
        "amount": 1899,
        "currency": "INR",
        "updated": "2026-11-10T09:16:00+05:30",
        "tracking": "NS-TRK-1005",
    },
]


def _startup_remaining_seconds() -> float:
    if not SIMULATE_SLOW_START and STARTUP_DELAY_SECONDS <= 0:
        return 0.0
    return max(0.0, STARTUP_DELAY_SECONDS - (time.time() - STARTED_AT))


def _now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _next_order_id() -> str:
    numeric_ids = [int(o["id"]) for o in ORDERS if o["id"].isdigit()]
    return str(max(numeric_ids, default=1000) + 1)


@app.get("/")
def root():
    return {
        "service": "retail-order-tracking-api",
        "version": APP_VERSION,
        "instance": INSTANCE_ID,
        "docs": "/docs",
    }


@app.get("/health")
def health():
    # Startup/Liveness: returns 503 during initialization, then 200 while process is alive.
    remaining = _startup_remaining_seconds()
    if remaining > 0:
        raise HTTPException(
            status_code=503, detail=f"initializing ({remaining:.1f}s remaining)"
        )
    return {
        "status": "alive",
        "version": APP_VERSION,
        "instance": INSTANCE_ID,
        "uptime_seconds": round(time.time() - STARTED_AT, 2),
    }


@app.get("/ready")
def ready():
    # Readiness: removes Pod from Service endpoints during startup or unready state.
    remaining = _startup_remaining_seconds()
    if remaining > 0:
        raise HTTPException(
            status_code=503, detail=f"initializing ({remaining:.1f}s remaining)"
        )
    if SIMULATE_UNREADY:
        raise HTTPException(status_code=503, detail="instance marked unready")
    return {
        "status": "ready",
        "version": APP_VERSION,
        "instance": INSTANCE_ID,
    }


@app.post("/ops/readiness")
def set_readiness(ready_state: bool = Query(..., alias="ready")):
    if not ENABLE_OPS_TOGGLE:
        raise HTTPException(status_code=403, detail="ops readiness toggle is disabled")
    global SIMULATE_UNREADY
    SIMULATE_UNREADY = not ready_state
    return {
        "ready": ready_state,
        "status": "ready" if ready_state else "unready",
        "instance": INSTANCE_ID,
    }


@app.get("/version")
def version():
    return {
        "version": APP_VERSION,
        "service": "retail-order-tracking-api",
        "instance": INSTANCE_ID,
    }


@app.get("/orders")
def list_orders(status: Optional[str] = None):
    if status:
        return [o for o in ORDERS if o["status"].lower() == status.lower()]
    return ORDERS


@app.post("/orders", status_code=201)
def create_order(payload: OrderCreate):
    order_id = (payload.id or _next_order_id()).strip()
    if any(o["id"] == order_id for o in ORDERS):
        raise HTTPException(status_code=409, detail=f"Order #{order_id} already exists")
    order = {
        "id": order_id,
        "customer": payload.customer.strip(),
        "item": payload.item.strip(),
        "status": payload.status,
        "amount": payload.amount,
        "currency": payload.currency.upper(),
        "updated": _now_iso(),
        "tracking": (payload.tracking or f"NS-TRK-{order_id}").strip(),
    }
    ORDERS.insert(0, order)
    return order


@app.get("/orders/{order_id}")
def get_order(order_id: str):
    for order in ORDERS:
        if order["id"] == order_id:
            return order
    raise HTTPException(status_code=404, detail="Order not found")


@app.patch("/orders/{order_id}")
def update_order_status(order_id: str, payload: OrderStatusUpdate):
    for order in ORDERS:
        if order["id"] == order_id:
            order["status"] = payload.status
            order["updated"] = _now_iso()
            return order
    raise HTTPException(status_code=404, detail="Order not found")
