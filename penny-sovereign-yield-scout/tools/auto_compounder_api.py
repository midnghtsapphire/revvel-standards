#!/usr/bin/env python3
"""
auto_compounder_api.py — FastAPI Auto-Compounder Server
penny-sovereign-yield-scout | Freedom Angel Corp / Audrey Evans

Provides a verifiable, auditable REST API for triggering auto-compound
actions on DeFi yield positions. Includes gas guard to ensure compounding
is always profitable.

Start server:
    uvicorn tools.auto_compounder_api:app --reload --port 8765

API docs (when running):
    http://localhost:8765/docs
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Depends, Security
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

logger = logging.getLogger(__name__)

# ─── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Penny Sovereign Yield Scout — Auto-Compounder API",
    description=(
        "Verifiable auto-compound server for DeFi yield positions. "
        "Every action is logged to a tamper-evident JSONL audit chain."
    ),
    version="1.0.0",
    contact={"name": "Audrey Evans / Freedom Angel Corp"},
    license_info={"name": "All Rights Reserved — Freedom Angel Corp 2026"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Security setup ────────────────────────────────────────────────────────────

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

def validate_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    Validate the request API key against COMPOUND_API_KEY env var.
    Returns the key if valid, else raises 403 Forbidden.
    """
    expected_key = os.getenv("COMPOUND_API_KEY")
    if not expected_key:
        # If no key is configured, we reject all sensitive requests for safety
        raise HTTPException(
            status_code=500,
            detail="API authentication not configured on server"
        )
    if api_key != expected_key:
        raise HTTPException(
            status_code=403,
            detail="Could not validate credentials"
        )
    return api_key


DEFILLAMA_BASE = os.getenv("DEFILLAMA_BASE_URL", "https://yields.llama.fi")
LOG_DIR = Path(os.getenv("VERIFIABLE_LOG_DIR", "./logs"))
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "compound_audit.jsonl"

# ─── ETH price feed config ────────────────────────────────────────────────────
# Live ETH price via CoinGecko (free, no API key). Values are cached for
# ETH_PRICE_CACHE_TTL_SECONDS seconds. If the API is unreachable or returns
# an unexpected payload, we fall back to ETH_PRICE_FALLBACK_USD so the gas
# estimator keeps working offline.
ETH_PRICE_API_URL = os.getenv(
    "ETH_PRICE_API_URL",
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
)
ETH_PRICE_FALLBACK_USD = float(os.getenv("ETH_PRICE_FALLBACK_USD", "3500.0"))
ETH_PRICE_CACHE_TTL_SECONDS = float(os.getenv("ETH_PRICE_CACHE_TTL_SECONDS", "300"))
ETH_PRICE_HTTP_TIMEOUT_SECONDS = float(os.getenv("ETH_PRICE_HTTP_TIMEOUT_SECONDS", "5"))

# Cache: {"price": float, "fetched_at": float_epoch, "source": str}
_eth_price_cache: dict = {}

# In-memory position store (replace with DB in production)
_positions: dict[str, dict] = {}
_compound_history: list[dict] = []


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CompoundRequest(BaseModel):
    protocol: str = Field(..., description="Protocol slug (e.g. 'aave-v3')")
    pool_id: str = Field(..., description="Pool identifier or address")
    wallet: str = Field(..., description="EVM wallet address (0x...)")
    position_usd: float = Field(..., gt=0, description="Current position size in USD")
    apy: float = Field(..., gt=0, description="Current APY (%)")
    gas_price_gwei: float = Field(default=1.0, description="Current gas price in gwei")
    chain: str = Field(default="arbitrum", description="Target chain")


class CompoundResponse(BaseModel):
    compound_id: str
    status: str
    protocol: str
    pool_id: str
    wallet: str
    estimated_gas_usd: float
    accumulated_yield_usd: float
    gas_guard_passed: bool
    message: str
    timestamp: str
    audit_hash: str


class PositionResponse(BaseModel):
    position_id: str
    protocol: str
    pool_id: str
    wallet: str
    position_usd: float
    apy: float
    chain: str
    entry_timestamp: str
    last_compound: Optional[str]
    total_compounded_usd: float


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    positions_tracked: int
    compounds_executed: int
    log_file: str


# ─── Gas guard ────────────────────────────────────────────────────────────────

def fetch_eth_price_usd(force_refresh: bool = False) -> dict:
    """
    Return the current ETH/USD price using CoinGecko, with a 5-minute TTL cache
    and a configurable fallback constant when the API is unreachable.

    Returns a dict: {"price": float, "source": str, "fetched_at": iso_timestamp,
    "cached": bool}. ``source`` is one of ``"coingecko"``, ``"cache"``,
    ``"cache-stale"``, or ``"fallback"``.
    """
    now = time.time()
    cached = "price" in _eth_price_cache
    fresh = cached and (now - _eth_price_cache.get("fetched_at", 0)) < ETH_PRICE_CACHE_TTL_SECONDS

    if fresh and not force_refresh:
        return {
            "price": _eth_price_cache["price"],
            "source": "cache",
            "fetched_at": datetime.fromtimestamp(
                _eth_price_cache["fetched_at"], tz=timezone.utc
            ).isoformat(),
            "cached": True,
        }

    try:
        resp = requests.get(ETH_PRICE_API_URL, timeout=ETH_PRICE_HTTP_TIMEOUT_SECONDS)
        resp.raise_for_status()
        payload = resp.json()
        price = float(payload["ethereum"]["usd"])
        if price <= 0:
            raise ValueError(f"Non-positive price returned: {price}")
        _eth_price_cache.update({"price": price, "fetched_at": now, "source": "coingecko"})
        return {
            "price": price,
            "source": "coingecko",
            "fetched_at": datetime.fromtimestamp(now, tz=timezone.utc).isoformat(),
            "cached": False,
        }
    except (requests.RequestException, ValueError, KeyError, TypeError) as exc:
        logger.warning("ETH price fetch failed (%s); using fallback $%.2f", exc, ETH_PRICE_FALLBACK_USD)
        # Prefer a stale cached value over the static fallback, if one exists.
        if cached:
            return {
                "price": _eth_price_cache["price"],
                "source": "cache-stale",
                "fetched_at": datetime.fromtimestamp(
                    _eth_price_cache["fetched_at"], tz=timezone.utc
                ).isoformat(),
                "cached": True,
            }
        return {
            "price": ETH_PRICE_FALLBACK_USD,
            "source": "fallback",
            "fetched_at": datetime.fromtimestamp(now, tz=timezone.utc).isoformat(),
            "cached": False,
        }


def estimate_gas_cost(
    gas_price_gwei: float,
    gas_units: int = 200_000,
    eth_price_usd: Optional[float] = None,
) -> float:
    """Estimate gas cost in USD for a compound transaction.

    If ``eth_price_usd`` is not provided, the live CoinGecko price is used
    (cached for 5 minutes), falling back to ``ETH_PRICE_FALLBACK_USD`` when
    the API is unreachable.
    """
    if eth_price_usd is None:
        eth_price_usd = fetch_eth_price_usd()["price"]
    gas_eth = gas_price_gwei * gas_units * 1e-9
    return gas_eth * eth_price_usd


def gas_guard_check(gas_cost_usd: float, accumulated_yield_usd: float, max_ratio: float = 0.02) -> tuple[bool, str]:
    """
    Returns (passed, message).
    Guard fails if gas_cost > max_ratio × accumulated_yield.
    Default: gas must be < 2% of yield to compound.
    """
    if accumulated_yield_usd <= 0:
        return False, "No accumulated yield to compound"
    ratio = gas_cost_usd / accumulated_yield_usd
    if ratio > max_ratio:
        return False, (
            f"Gas cost (${gas_cost_usd:.4f}) is {ratio*100:.1f}% of yield "
            f"(${accumulated_yield_usd:.4f}) — exceeds {max_ratio*100:.0f}% threshold. "
            "Wait for more yield to accumulate."
        )
    return True, f"Gas guard passed — ratio {ratio*100:.2f}% < {max_ratio*100:.0f}%"


def estimate_accumulated_yield(position_usd: float, apy: float, hours_since_last: float = 24.0) -> float:
    """Estimate accumulated yield since last compound."""
    daily_rate = apy / 100.0 / 365.0
    return position_usd * daily_rate * (hours_since_last / 24.0)


# ─── Audit logging ────────────────────────────────────────────────────────────

_last_hash: str = "0" * 64


def _write_audit_entry(event: str, data: dict) -> str:
    global _last_hash
    entry = {
        "event": event,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "prev_hash": _last_hash,
    }
    entry_str = json.dumps(entry, default=str, sort_keys=True)
    entry_hash = hashlib.sha256(entry_str.encode()).hexdigest()
    entry["entry_hash"] = entry_hash

    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, default=str) + "\n")

    _last_hash = entry_hash
    return entry_hash


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
def health() -> HealthResponse:
    """Health check — returns server status and stats."""
    return HealthResponse(
        status="ok",
        version="1.0.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        positions_tracked=len(_positions),
        compounds_executed=len(_compound_history),
        log_file=str(LOG_FILE),
    )


@app.get("/eth-price", tags=["System"])
def eth_price(force_refresh: bool = Query(default=False, description="Bypass the 5-minute cache")) -> dict:
    """Return the current ETH/USD price used by the gas estimator.

    Uses CoinGecko with a 5-minute TTL cache, falling back to
    ``ETH_PRICE_FALLBACK_USD`` (default $3500) when the API is unreachable.
    """
    return fetch_eth_price_usd(force_refresh=force_refresh)


@app.post("/compound", response_model=CompoundResponse, tags=["Compounding"], dependencies=[Depends(validate_api_key)])
def trigger_compound(req: CompoundRequest) -> CompoundResponse:
    """
    Trigger an auto-compound action for a yield position.
    Runs gas guard before executing. Every action is audit-logged.
    """
    compound_id = str(uuid.uuid4())[:8]
    hours_since_last = 24.0  # Default: assume 24h since last compound

    # Find existing position for more accurate timing
    pos_key = f"{req.wallet}:{req.pool_id}"
    if pos_key in _positions:
        pos = _positions[pos_key]
        last = datetime.fromisoformat(pos.get("last_compound", pos["entry_timestamp"]))
        hours_since_last = (datetime.now(timezone.utc) - last).total_seconds() / 3600

    accumulated_yield = estimate_accumulated_yield(req.position_usd, req.apy, hours_since_last)
    gas_cost = estimate_gas_cost(req.gas_price_gwei)
    guard_passed, guard_msg = gas_guard_check(gas_cost, accumulated_yield)

    status = "executed" if guard_passed else "skipped_gas_guard"
    audit_hash = _write_audit_entry(
        "COMPOUND_" + status.upper(),
        {
            "compound_id": compound_id,
            "protocol": req.protocol,
            "pool_id": req.pool_id,
            "wallet": req.wallet,
            "position_usd": req.position_usd,
            "apy": req.apy,
            "accumulated_yield_usd": accumulated_yield,
            "gas_cost_usd": gas_cost,
            "gas_guard_passed": guard_passed,
            "chain": req.chain,
        },
    )

    if guard_passed:
        # Update position state
        now_iso = datetime.now(timezone.utc).isoformat()
        if pos_key in _positions:
            _positions[pos_key]["last_compound"] = now_iso
            _positions[pos_key]["total_compounded_usd"] = (
                _positions[pos_key].get("total_compounded_usd", 0) + accumulated_yield
            )
        else:
            _positions[pos_key] = {
                "protocol": req.protocol,
                "pool_id": req.pool_id,
                "wallet": req.wallet,
                "position_usd": req.position_usd,
                "apy": req.apy,
                "chain": req.chain,
                "entry_timestamp": now_iso,
                "last_compound": now_iso,
                "total_compounded_usd": accumulated_yield,
            }

        record = {
            "compound_id": compound_id,
            "protocol": req.protocol,
            "pool_id": req.pool_id,
            "wallet": req.wallet,
            "accumulated_yield_usd": accumulated_yield,
            "timestamp": now_iso,
        }
        _compound_history.append(record)

    return CompoundResponse(
        compound_id=compound_id,
        status=status,
        protocol=req.protocol,
        pool_id=req.pool_id,
        wallet=req.wallet,
        estimated_gas_usd=round(gas_cost, 6),
        accumulated_yield_usd=round(accumulated_yield, 6),
        gas_guard_passed=guard_passed,
        message=guard_msg,
        timestamp=datetime.now(timezone.utc).isoformat(),
        audit_hash=audit_hash,
    )


@app.get("/history", tags=["Compounding"], dependencies=[Depends(validate_api_key)])
def get_history(
    wallet: Optional[str] = Query(default=None, description="Filter by wallet address"),
    limit: int = Query(default=50, le=500),
) -> dict:
    """Retrieve compound history, optionally filtered by wallet."""
    history = _compound_history
    if wallet:
        history = [h for h in history if h.get("wallet", "").lower() == wallet.lower()]
    return {
        "total": len(history),
        "records": history[-limit:],
    }


@app.get("/positions", tags=["Positions"], dependencies=[Depends(validate_api_key)])
def list_positions(wallet: Optional[str] = Query(default=None)) -> dict:
    """List all tracked positions, optionally filtered by wallet."""
    positions = list(_positions.values())
    if wallet:
        positions = [p for p in positions if p.get("wallet", "").lower() == wallet.lower()]
    return {"total": len(positions), "positions": positions}


@app.get("/optimal-interval", tags=["Analytics"])
def optimal_compound_interval(
    position_usd: float = Query(..., description="Position size in USD"),
    apy: float = Query(..., description="Current APY (%)"),
    gas_cost_usd: float = Query(default=0.50, description="Gas cost per compound in USD"),
) -> dict:
    """
    Calculate the optimal compound interval to maximise net yield.

    Formula: interval_days = sqrt(2 × gas_cost_usd / (position_usd × apy_daily))
    """
    apy_daily = apy / 100.0 / 365.0
    if apy_daily <= 0 or position_usd <= 0:
        raise HTTPException(status_code=400, detail="position_usd and apy must be > 0")

    interval_days = math.sqrt(2 * gas_cost_usd / (position_usd * apy_daily))
    interval_hours = interval_days * 24

    return {
        "position_usd": position_usd,
        "apy_pct": apy,
        "gas_cost_usd": gas_cost_usd,
        "optimal_interval_days": round(interval_days, 4),
        "optimal_interval_hours": round(interval_hours, 2),
        "optimal_interval_minutes": round(interval_hours * 60, 0),
        "daily_yield_usd": round(position_usd * apy_daily, 4),
        "note": "Compound more frequently as position grows or gas falls.",
    }


@app.get("/audit/verify", tags=["Audit"], dependencies=[Depends(validate_api_key)])
def verify_audit_log() -> dict:
    """Verify the integrity of the audit chain log."""
    if not LOG_FILE.exists():
        return {"verified": True, "entries": 0, "message": "No audit log yet."}

    entries = 0
    prev_hash = "0" * 64
    tampered_at: list[int] = []

    with open(LOG_FILE, encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                stored_hash = entry.pop("entry_hash", "")
                if entry.get("prev_hash") != prev_hash:
                    tampered_at.append(line_no)
                entry_str = json.dumps(entry, default=str, sort_keys=True)
                computed_hash = hashlib.sha256(entry_str.encode()).hexdigest()
                if computed_hash != stored_hash:
                    tampered_at.append(line_no)
                prev_hash = stored_hash
                entries += 1
            except json.JSONDecodeError:
                tampered_at.append(line_no)

    return {
        "verified": len(tampered_at) == 0,
        "entries": entries,
        "tampered_at_lines": tampered_at,
        "message": "✅ Chain integrity verified — no tampering detected."
        if not tampered_at
        else f"❌ Tampering detected at lines: {tampered_at}",
    }


# ─── Dev entry point ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="info")
