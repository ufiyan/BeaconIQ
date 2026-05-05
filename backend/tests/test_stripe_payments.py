"""
BeaconIQ backend regression tests:
- /api/health
- Stripe Checkout session creation (valid, invalid, missing fields)
- Stripe Checkout status retrieval (valid + bogus session id)
- Catch-all Base44 proxy still works
- MongoDB persistence of payment_transactions row
"""

import os
import pytest
import requests
from pymongo import MongoClient

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "beaconiq"


# --- Health endpoint ---------------------------------------------------------
class TestHealth:
    def test_health_ok(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert data["stripe_configured"] is True
        assert data["mongo_configured"] is True


# --- Stripe Checkout: create session ----------------------------------------
class TestCheckoutSessionCreate:
    def test_create_starter_session(self, api_client, base_url):
        payload = {"package_id": "starter", "origin_url": "https://example.com"}
        r = api_client.post(
            f"{base_url}/api/payments/checkout/session", json=payload
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and data["url"].startswith("https://")
        assert "stripe.com" in data["url"] or "checkout" in data["url"]
        assert "session_id" in data and isinstance(data["session_id"], str)
        # Stash for later test usage
        pytest.starter_session_id = data["session_id"]

    def test_create_pro_session(self, api_client, base_url):
        payload = {"package_id": "pro", "origin_url": "https://example.com"}
        r = api_client.post(
            f"{base_url}/api/payments/checkout/session", json=payload
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["url"].startswith("https://")
        assert isinstance(data["session_id"], str) and len(data["session_id"]) > 0

    def test_create_unknown_package_returns_400(self, api_client, base_url):
        payload = {"package_id": "hacked_99cents", "origin_url": "https://example.com"}
        r = api_client.post(
            f"{base_url}/api/payments/checkout/session", json=payload
        )
        assert r.status_code == 400, r.text
        body = r.json()
        assert "hacked_99cents" in str(body).lower() or "unknown" in str(body).lower()

    def test_create_missing_origin_url_returns_422(self, api_client, base_url):
        payload = {"package_id": "starter"}
        r = api_client.post(
            f"{base_url}/api/payments/checkout/session", json=payload
        )
        assert r.status_code == 422, r.text


# --- Stripe Checkout: status -------------------------------------------------
class TestCheckoutStatus:
    def test_status_for_real_session(self, api_client, base_url):
        sid = getattr(pytest, "starter_session_id", None)
        if not sid:
            pytest.skip("No starter session id available")
        r = api_client.get(f"{base_url}/api/payments/checkout/status/{sid}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "status" in data
        assert "payment_status" in data
        assert "amount_total" in data
        assert "currency" in data
        # Status before any user payment should be "open" / "unpaid"
        assert data["payment_status"] in ("unpaid", "paid", "no_payment_required")

    def test_status_for_bogus_session_does_not_crash(self, api_client, base_url):
        bogus = "cs_test_bogus_does_not_exist_12345"
        r = api_client.get(f"{base_url}/api/payments/checkout/status/{bogus}")
        # Should be a 4xx/5xx but service must not be down
        assert r.status_code >= 400, r.text
        assert r.status_code < 600


# --- Mongo persistence -------------------------------------------------------
class TestMongoPersistence:
    def test_payment_transaction_row_exists(self):
        sid = getattr(pytest, "starter_session_id", None)
        if not sid:
            pytest.skip("No starter session id available")
        client = MongoClient(MONGO_URL)
        try:
            doc = client[DB_NAME].payment_transactions.find_one({"session_id": sid})
            assert doc is not None, f"No payment_transactions row for session {sid}"
            assert doc["package_id"] == "starter"
            assert float(doc["amount"]) == 29.0
            assert doc["currency"] == "usd"
            assert doc["payment_status"] == "pending"
            assert doc.get("status") == "initiated"
            assert "created_at" in doc and "updated_at" in doc
        finally:
            client.close()


# --- Base44 catch-all proxy --------------------------------------------------
class TestBase44Proxy:
    def test_public_settings_proxy(self, api_client, base_url):
        url = f"{base_url}/api/apps/public/prod/public-settings/by-id/69ceddc3e8db99cfbe0e3b39"
        r = api_client.get(url)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:300]}"
        # Must be JSON from Base44
        data = r.json()
        assert isinstance(data, dict)
        # Should at least look like a Base44 public_settings payload
        assert len(data.keys()) > 0
