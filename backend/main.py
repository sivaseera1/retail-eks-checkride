import os
import socket
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
INSTANCE_ID = os.getenv("HOSTNAME", socket.gethostname())
SIMULATE_UNREADY = os.getenv("SIMULATE_UNREADY", "false").lower() == "true"

app = FastAPI(title="Retail Order Tracking API", version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ORDERS = [
    {"id": "1001", "customer": "Aarav Mehta", "item": "Runner Sneakers", "status": "Shipped", "amount": 4299, "currency": "INR", "tracking": "NS-TRK-1001"},
    {"id": "1002", "customer": "Diya Reddy", "item": "Linen Shirt", "status": "Processing", "amount": 2199, "currency": "INR", "tracking": "NS-TRK-1002"},
    {"id": "1003", "customer": "Kabir Shah", "item": "Wireless Headphones", "status": "Delivered", "amount": 6499, "currency": "INR", "tracking": "NS-TRK-1003"},
    {"id": "1004", "customer": "Ananya Iyer", "item": "Leather Tote", "status": "Shipped", "amount": 3750, "currency": "INR", "tracking": "NS-TRK-1004"},
    {"id": "1005", "customer": "Rohan Das", "item": "Table Lamp", "status": "Processing", "amount": 1899, "currency": "INR", "tracking": "NS-TRK-1005"},
]


class OrderCreate(BaseModel):
    id: Optional[str] = None
    customer: str = Field(..., min_length=1)
    item: str = Field(..., min_length=1)
    status: str = "Processing"
    amount: float = Field(..., gt=0)
    currency: str = "INR"
    tracking: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str


@app.get("/")
def root():
    return {"service": "retail-order-tracking-api", "version": APP_VERSION, "instance": INSTANCE_ID}


@app.get("/health")
def health():
    return {"status": "alive", "version": APP_VERSION, "instance": INSTANCE_ID}


@app.get("/ready")
def ready():
    if SIMULATE_UNREADY:
        raise HTTPException(status_code=503, detail="instance marked unready")
    return {"status": "ready", "version": APP_VERSION, "instance": INSTANCE_ID}


@app.post("/ops/readiness")
def set_readiness(ready_state: bool = Query(..., alias="ready")):
    global SIMULATE_UNREADY
    SIMULATE_UNREADY = not ready_state
    return {"ready": ready_state, "status": "ready" if ready_state else "unready", "instance": INSTANCE_ID}


@app.get("/version")
def version():
    return {"version": APP_VERSION, "service": "retail-order-tracking-api", "instance": INSTANCE_ID}


@app.get("/orders")
def list_orders(status: Optional[str] = None):
    if status:
        return [o for o in ORDERS if o["status"].lower() == status.lower()]
    return ORDERS


@app.get("/orders/{order_id}")
def get_order(order_id: str):
    for order in ORDERS:
        if order["id"] == order_id:
            return order
    raise HTTPException(status_code=404, detail="Order not found")


@app.post("/orders", status_code=201)
def create_order(payload: OrderCreate):
    order_id = payload.id or str(max([int(o["id"]) for o in ORDERS if o["id"].isdigit()], default=1000) + 1)
    if any(o["id"] == order_id for o in ORDERS):
        raise HTTPException(status_code=409, detail=f"Order #{order_id} already exists")
    order = {
        "id": order_id,
        "customer": payload.customer.strip(),
        "item": payload.item.strip(),
        "status": payload.status,
        "amount": payload.amount,
        "currency": payload.currency.upper(),
        "tracking": payload.tracking or f"NS-TRK-{order_id}",
    }
    ORDERS.insert(0, order)
    return order


@app.patch("/orders/{order_id}")
def update_order_status(order_id: str, payload: OrderStatusUpdate):
    for order in ORDERS:
        if order["id"] == order_id:
            order["status"] = payload.status
            return order
    raise HTTPException(status_code=404, detail="Order not found")
