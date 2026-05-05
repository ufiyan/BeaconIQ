"""
BeaconIQ backend.

Two responsibilities:
1. /api/payments/* + /api/webhook/stripe — local Stripe Checkout endpoints.
2. /api/* — transparent proxy to https://base44.app/api/* for everything else
   (the Base44 SDK relies on this so the frontend's relative `/api/...` calls
   reach the right backend in the Emergent preview ingress).
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from emergentintegrations.payments.stripe.checkout import (
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    StripeCheckout,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

BASE44_UPSTREAM = os.environ.get("BASE44_UPSTREAM", "https://base44.app")
TIMEOUT_SECONDS = float(os.environ.get("BASE44_PROXY_TIMEOUT", "60"))
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

# --- Pricing packages (server-defined, never trust frontend amounts) -----
# id -> (display name, monthly price in USD float, optional Stripe price_id)
PRICING_PACKAGES: dict[str, dict] = {
    "starter": {"name": "Starter", "amount": 29.00, "currency": "usd"},
    "pro": {"name": "Pro", "amount": 79.00, "currency": "usd"},
}

# Hop-by-hop headers we must not forward (RFC 7230 §6.1) plus a few headers
# the upstream sets that our own server (uvicorn / ingress) will re-set.
_HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
    "content-encoding",
    "date",
    "server",
}

app = FastAPI(title="BeaconIQ Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_proxy_client: httpx.AsyncClient | None = None
_mongo_client: AsyncIOMotorClient | None = None


def _db():
    assert _mongo_client is not None
    return _mongo_client[DB_NAME]


@app.on_event("startup")
async def _startup() -> None:
    global _proxy_client, _mongo_client
    _proxy_client = httpx.AsyncClient(timeout=TIMEOUT_SECONDS, follow_redirects=False)
    _mongo_client = AsyncIOMotorClient(MONGO_URL)


@app.on_event("shutdown")
async def _shutdown() -> None:
    if _proxy_client is not None:
        await _proxy_client.aclose()
    if _mongo_client is not None:
        _mongo_client.close()


@app.get("/api/health")
async def health() -> dict:
    return {
        "status": "ok",
        "upstream": BASE44_UPSTREAM,
        "stripe_configured": bool(STRIPE_API_KEY),
        "mongo_configured": bool(MONGO_URL and DB_NAME),
    }


# --------------------------- Stripe Checkout API ---------------------------


class CheckoutSessionPayload(BaseModel):
    package_id: str = Field(..., description="One of the keys in PRICING_PACKAGES")
    origin_url: str = Field(..., description="Frontend window.location.origin")


class CheckoutSessionOut(BaseModel):
    url: str
    session_id: str


class CheckoutStatusOut(BaseModel):
    status: str
    payment_status: str
    amount_total: int
    currency: str
    metadata: dict


def _stripe_for(request: Request) -> StripeCheckout:
    if not STRIPE_API_KEY:
        raise HTTPException(500, "Stripe is not configured (STRIPE_API_KEY missing)")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


@app.post("/api/payments/checkout/session", response_model=CheckoutSessionOut)
async def create_checkout_session(
    payload: CheckoutSessionPayload, request: Request
) -> CheckoutSessionOut:
    package = PRICING_PACKAGES.get(payload.package_id)
    if package is None:
        raise HTTPException(400, f"Unknown package_id '{payload.package_id}'")

    origin = payload.origin_url.rstrip("/")
    success_url = f"{origin}/?stripe_status=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/?stripe_status=cancelled"

    metadata = {
        "package_id": payload.package_id,
        "package_name": package["name"],
        "source": "beaconiq_pricing_page",
    }

    stripe = _stripe_for(request)
    checkout_request = CheckoutSessionRequest(
        amount=float(package["amount"]),
        currency=package["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session: CheckoutSessionResponse = await stripe.create_checkout_session(checkout_request)

    # Persist initial transaction record BEFORE redirect
    await _db().payment_transactions.insert_one(
        {
            "_id": str(uuid.uuid4()),
            "session_id": session.session_id,
            "package_id": payload.package_id,
            "amount": package["amount"],
            "currency": package["currency"],
            "metadata": metadata,
            "payment_status": "pending",
            "status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    return CheckoutSessionOut(url=session.url, session_id=session.session_id)


@app.get("/api/payments/checkout/status/{session_id}", response_model=CheckoutStatusOut)
async def get_checkout_status(session_id: str, request: Request) -> CheckoutStatusOut:
    stripe = _stripe_for(request)
    status: CheckoutStatusResponse = await stripe.get_checkout_status(session_id)

    db = _db()
    existing = await db.payment_transactions.find_one({"session_id": session_id})

    # Idempotent update: only flip to a new state, never re-process a paid one.
    if existing is not None and existing.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "payment_status": status.payment_status,
                    "status": status.status,
                    "amount_total": status.amount_total,
                    "currency": status.currency,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

    return CheckoutStatusOut(
        status=status.status,
        payment_status=status.payment_status,
        amount_total=status.amount_total,
        currency=status.currency,
        metadata=status.metadata or {},
    )


@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request) -> dict:
    stripe = _stripe_for(request)
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    event = await stripe.handle_webhook(body, signature)

    db = _db()
    if event.session_id:
        await db.payment_transactions.update_one(
            {"session_id": event.session_id},
            {
                "$set": {
                    "payment_status": event.payment_status,
                    "webhook_event_type": event.event_type,
                    "webhook_event_id": event.event_id,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
    return {"received": True}


# --------------------------- Base44 transparent proxy ---------------------------


@app.api_route(
    "/api/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def proxy(full_path: str, request: Request) -> Response:
    assert _proxy_client is not None

    upstream_url = f"{BASE44_UPSTREAM}/api/{full_path}"
    if request.url.query:
        upstream_url = f"{upstream_url}?{request.url.query}"

    forward_headers = {
        k: v for k, v in request.headers.items() if k.lower() not in _HOP_BY_HOP
    }
    body = await request.body()

    upstream_resp = await _proxy_client.request(
        request.method,
        upstream_url,
        headers=forward_headers,
        content=body,
    )

    response_headers = {
        k: v for k, v in upstream_resp.headers.items() if k.lower() not in _HOP_BY_HOP
    }

    return Response(
        content=upstream_resp.content,
        status_code=upstream_resp.status_code,
        headers=response_headers,
        media_type=upstream_resp.headers.get("content-type"),
    )
