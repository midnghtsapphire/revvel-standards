#!/usr/bin/env python3
"""
stream_listener.py — GrowlingEyes Multi-Source Real-Time Stream Listener
growlingeyes | Freedom Angel Corp — "We believe you."

Connects to live data streams including:
  • AIS vessel tracking (aisstream.io WebSocket)
  • NOAA Weather Alerts (Server-Sent Events)
  • USGS Earthquake feed (polling)
  • RSS/Atom feeds (polling via feedparser)
  • Custom WebSocket streams

All events are normalised to StreamEvent and can be consumed by downstream
processors (GrowlingEyes precog feed, dashboard, MySQL insert workers).

Usage:
    python tools/stream_listener.py
    python tools/stream_listener.py --streams ais noaa_weather usgs
    python tools/stream_listener.py --output stream_events.jsonl
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import AsyncIterator, Optional

import feedparser
import httpx
from dotenv import load_dotenv
from rich.console import Console

load_dotenv()
console = Console()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("stream_listener")

# ─── AIS stream endpoint ──────────────────────────────────────────────────────
AISSTREAM_WS_URL = "wss://stream.aisstream.io/v0/stream"

# ─── NOAA Weather Alerts endpoint ────────────────────────────────────────────
NOAA_ALERTS_URL = "https://api.weather.gov/alerts/active"

# ─── USGS Earthquake feed ─────────────────────────────────────────────────────
USGS_QUAKE_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson"

# ─── RSS feeds polled in the stream listener ──────────────────────────────────
RSS_STREAMS: dict[str, str] = {
    "gdacs":        "https://www.gdacs.org/xml/rss.xml",
    "who":          "https://www.who.int/rss-feeds/news-english.xml",
    "cisa_alerts":  "https://www.cisa.gov/cybersecurity-advisories/all.xml",
    "nrc":          "https://www.nrc.gov/public-involve/public-meetings/event-report.rss",
    "dod":          "https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945",
}


# ─── Data model ───────────────────────────────────────────────────────────────

@dataclass
class StreamEvent:
    stream: str
    event_type: str
    title: str
    description: str
    lat: Optional[float]
    lng: Optional[float]
    severity: str
    raw: dict = field(default_factory=dict)
    received_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> dict:
        return asdict(self)

    def to_jsonl(self) -> str:
        return json.dumps(self.to_dict(), default=str)


# ─── AIS WebSocket stream ─────────────────────────────────────────────────────

async def stream_ais(
    bbox: Optional[list[float]] = None,
    output_queue: Optional[asyncio.Queue] = None,
) -> AsyncIterator[StreamEvent]:
    """
    Stream vessel AIS positions from aisstream.io via WebSocket.

    Args:
        bbox: Bounding box [min_lon, min_lat, max_lon, max_lat] to filter positions.
              Defaults to world coverage [-180, -90, 180, 90].
        output_queue: If provided, put events on this queue instead of yielding.

    Env:
        AISSTREAM_API_KEY: Required for authenticated access (free tier available).
    """
    try:
        import websockets  # type: ignore
    except ImportError:
        log.error("websockets package not installed. Run: pip install websockets")
        return

    api_key = os.environ.get("AISSTREAM_API_KEY", "")
    subscription = {
        "APIKey": api_key,
        "BoundingBoxes": [bbox or [[-90, -180], [90, 180]]],
        "FilterMessageTypes": ["PositionReport"],
    }

    try:
        async with websockets.connect(AISSTREAM_WS_URL) as ws:
            await ws.send(json.dumps(subscription))
            log.info("AIS WebSocket connected")
            async for raw_msg in ws:
                try:
                    data = json.loads(raw_msg)
                    msg_type = data.get("MessageType", "")
                    if msg_type == "PositionReport":
                        pos = data.get("Message", {}).get("PositionReport", {})
                        meta = data.get("MetaData", {})
                        event = StreamEvent(
                            stream="aisstream",
                            event_type="vessel_position",
                            title=f"Vessel {meta.get('MMSI', 'unknown')} — {meta.get('ShipName', '').strip()}",
                            description=f"SOG={pos.get('Sog')} kts, COG={pos.get('Cog')}°",
                            lat=pos.get("Latitude"),
                            lng=pos.get("Longitude"),
                            severity="INFO",
                            raw=data,
                        )
                        if output_queue:
                            await output_queue.put(event)
                        else:
                            yield event
                except json.JSONDecodeError:
                    continue
    except Exception as exc:
        log.error("AIS stream error: %s", exc)


# ─── NOAA Weather Alerts polling ─────────────────────────────────────────────

async def stream_noaa_weather(
    poll_interval: int = 60,
    output_queue: Optional[asyncio.Queue] = None,
) -> AsyncIterator[StreamEvent]:
    """
    Poll NOAA active weather alerts and emit new ones as StreamEvents.

    Args:
        poll_interval: Seconds between polls (default 60).
        output_queue:  Queue to push events; if None, yield directly.
    """
    seen_ids: set[str] = set()
    async with httpx.AsyncClient(timeout=15) as client:
        while True:
            try:
                resp = await client.get(NOAA_ALERTS_URL)
                resp.raise_for_status()
                data = resp.json()
                for feature in data.get("features", []):
                    props = feature.get("properties", {})
                    alert_id = props.get("id", feature.get("id", ""))
                    if alert_id in seen_ids:
                        continue
                    seen_ids.add(alert_id)
                    coords = None
                    geometry = feature.get("geometry")
                    if geometry and geometry.get("coordinates"):
                        try:
                            flat = geometry["coordinates"]
                            while isinstance(flat[0], list):
                                flat = flat[0]
                            coords = (flat[1], flat[0])
                        except (IndexError, TypeError):
                            coords = (None, None)
                    else:
                        coords = (None, None)

                    event = StreamEvent(
                        stream="noaa_weather",
                        event_type=props.get("event", "weather_alert"),
                        title=props.get("headline", props.get("event", "")),
                        description=props.get("description", "")[:400],
                        lat=coords[0],
                        lng=coords[1],
                        severity=props.get("severity", "Unknown"),
                        raw=props,
                    )
                    if output_queue:
                        await output_queue.put(event)
                    else:
                        yield event
            except Exception as exc:
                log.error("NOAA weather poll error: %s", exc)
            await asyncio.sleep(poll_interval)


# ─── USGS Earthquake polling ──────────────────────────────────────────────────

async def stream_usgs_quakes(
    poll_interval: int = 300,
    min_magnitude: float = 5.0,
    output_queue: Optional[asyncio.Queue] = None,
) -> AsyncIterator[StreamEvent]:
    """
    Poll USGS significant earthquake GeoJSON feed and emit new events.

    Args:
        poll_interval:  Seconds between polls (default 300).
        min_magnitude:  Minimum magnitude to report (default 5.0).
        output_queue:   Queue to push events; if None, yield directly.
    """
    seen_ids: set[str] = set()
    async with httpx.AsyncClient(timeout=15) as client:
        while True:
            try:
                resp = await client.get(USGS_QUAKE_URL)
                resp.raise_for_status()
                data = resp.json()
                for feature in data.get("features", []):
                    quake_id = feature.get("id", "")
                    if quake_id in seen_ids:
                        continue
                    props = feature.get("properties", {})
                    mag = props.get("mag") or 0
                    if mag < min_magnitude:
                        continue
                    seen_ids.add(quake_id)
                    coords = feature.get("geometry", {}).get("coordinates", [None, None])
                    event = StreamEvent(
                        stream="usgs_quakes",
                        event_type="earthquake",
                        title=f"M{mag} — {props.get('place', 'unknown location')}",
                        description=f"Depth: {coords[2]}km | Status: {props.get('status')}",
                        lat=coords[1] if len(coords) > 1 else None,
                        lng=coords[0] if coords else None,
                        severity="HIGH" if mag >= 7.0 else "MEDIUM",
                        raw=props,
                    )
                    if output_queue:
                        await output_queue.put(event)
                    else:
                        yield event
            except Exception as exc:
                log.error("USGS quake poll error: %s", exc)
            await asyncio.sleep(poll_interval)


# ─── RSS polling streams ──────────────────────────────────────────────────────

async def stream_rss(
    feed_name: str,
    feed_url: str,
    poll_interval: int = 600,
    output_queue: Optional[asyncio.Queue] = None,
) -> AsyncIterator[StreamEvent]:
    """
    Poll an RSS/Atom feed and emit new entries as StreamEvents.

    Args:
        feed_name:     Human-readable name (e.g. "gdacs").
        feed_url:      Feed URL.
        poll_interval: Seconds between polls (default 600).
        output_queue:  Queue to push events; if None, yield directly.
    """
    seen_ids: set[str] = set()
    while True:
        try:
            parsed = feedparser.parse(feed_url)
            for entry in parsed.entries:
                entry_id = entry.get("id") or entry.get("link", "")
                if entry_id in seen_ids:
                    continue
                seen_ids.add(entry_id)
                event = StreamEvent(
                    stream=feed_name,
                    event_type="rss_item",
                    title=entry.get("title", ""),
                    description=entry.get("summary", "")[:400],
                    lat=None,
                    lng=None,
                    severity="INFO",
                    raw={"link": entry.get("link", ""), "published": entry.get("published", "")},
                )
                if output_queue:
                    await output_queue.put(event)
                else:
                    yield event
        except Exception as exc:
            log.error("RSS poll error [%s]: %s", feed_name, exc)
        await asyncio.sleep(poll_interval)



def _write_and_flush(fh, data: str) -> None:
    """Helper to write and flush synchronously (to be run in a thread)."""
    fh.write(data)
    fh.flush()

# ─── Multi-stream runner ──────────────────────────────────────────────────────

async def run_streams(
    streams: Optional[list[str]] = None,
    output_file: Optional[str] = None,
) -> None:
    """
    Run all (or selected) streams concurrently and print/save events.

    Args:
        streams:     List of stream keys to enable (None = all).
        output_file: If set, append events as JSONL to this file.
    """
    queue: asyncio.Queue[StreamEvent] = asyncio.Queue()
    tasks = []

    active = streams or ["noaa_weather", "usgs_quakes"] + list(RSS_STREAMS.keys())

    if "ais" in active:
        tasks.append(asyncio.create_task(
            _drain(stream_ais(output_queue=queue), queue)
        ))
    if "noaa_weather" in active:
        tasks.append(asyncio.create_task(
            _drain_async(stream_noaa_weather(output_queue=queue), queue)
        ))
    if "usgs_quakes" in active:
        tasks.append(asyncio.create_task(
            _drain_async(stream_usgs_quakes(output_queue=queue), queue)
        ))
    for name, url in RSS_STREAMS.items():
        if name in active:
            tasks.append(asyncio.create_task(
                _drain_async(stream_rss(name, url, output_queue=queue), queue)
            ))

    try:
        out_fh = await asyncio.to_thread(open, output_file, "a", encoding="utf-8") if output_file else None
        try:
            while True:
                event: StreamEvent = await queue.get()
                msg = (
                    f"[{event.stream.upper()}] [{event.severity}] {event.title}"
                )
                console.print(f"  [cyan]{msg}[/]")
                if out_fh:
                    data = event.to_jsonl() + "\n"
                    await asyncio.to_thread(_write_and_flush, out_fh, data)
        finally:
            if out_fh:
                await asyncio.to_thread(out_fh.close)
    finally:
        for task in tasks:
            task.cancel()


async def _drain(
    agen: AsyncIterator[StreamEvent],
    queue: asyncio.Queue,
) -> None:
    """Drain a sync-over-async generator into the queue."""
    async for event in agen:
        await queue.put(event)


async def _drain_async(
    agen: AsyncIterator[StreamEvent],
    queue: asyncio.Queue,
) -> None:
    """Drain an async generator into the queue."""
    async for event in agen:
        await queue.put(event)


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    all_stream_keys = ["ais", "noaa_weather", "usgs_quakes"] + list(RSS_STREAMS.keys())
    parser = argparse.ArgumentParser(
        description="GrowlingEyes — Multi-Source Real-Time Stream Listener"
    )
    parser.add_argument(
        "--streams",
        nargs="+",
        choices=all_stream_keys,
        default=None,
        help="Streams to listen to (default: all except ais)",
    )
    parser.add_argument("--output", type=str, help="Append events as JSONL to file")
    args = parser.parse_args()

    console.rule("[bold cyan]📡 GrowlingEyes — Stream Listener[/]")
    try:
        asyncio.run(run_streams(streams=args.streams, output_file=args.output))
    except KeyboardInterrupt:
        console.print("\n[yellow]Stream listener stopped.[/]")


if __name__ == "__main__":
    main()
