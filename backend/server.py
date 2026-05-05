"""
BeaconIQ proxy backend.

The frontend (Vite/React) runs on port 3000 and the Emergent ingress routes any
`/api/*` request to this FastAPI app on port 8001. We forward those requests
to the actual Base44 platform at `https://base44.app/api/*` (preserving method,
headers, query string, and body) so the frontend's relative `/api/...` calls
made by the Base44 SDK reach the right backend in production.

In local `vite dev` the Vite plugin handles this proxying directly; this server
exists to make it work behind the Kubernetes ingress as well.
"""

from __future__ import annotations

import os
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

BASE44_UPSTREAM = os.environ.get("BASE44_UPSTREAM", "https://base44.app")
TIMEOUT_SECONDS = float(os.environ.get("BASE44_PROXY_TIMEOUT", "60"))

# Hop-by-hop headers we must not forward (RFC 7230 §6.1) plus a few headers
# that the upstream server set and that our own server (uvicorn / ingress) will
# re-set, so we strip them to avoid duplicates.
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

app = FastAPI(title="BeaconIQ Base44 Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_client: httpx.AsyncClient | None = None


@app.on_event("startup")
async def _startup() -> None:
    global _client
    _client = httpx.AsyncClient(timeout=TIMEOUT_SECONDS, follow_redirects=False)


@app.on_event("shutdown")
async def _shutdown() -> None:
    if _client is not None:
        await _client.aclose()


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "upstream": BASE44_UPSTREAM}


@app.api_route(
    "/api/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def proxy(full_path: str, request: Request) -> Response:
    assert _client is not None

    upstream_url = f"{BASE44_UPSTREAM}/api/{full_path}"
    if request.url.query:
        upstream_url = f"{upstream_url}?{request.url.query}"

    forward_headers = {
        k: v for k, v in request.headers.items() if k.lower() not in _HOP_BY_HOP
    }
    body = await request.body()

    upstream_resp = await _client.request(
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
