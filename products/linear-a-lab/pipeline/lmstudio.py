"""Minimal OpenAI-compatible chat client for LM Studio (stdlib only).

LM Studio serves http://localhost:1234/v1 by default. Override with the
GORILA_LMSTUDIO_URL environment variable. No API key is required locally.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

DEFAULT_BASE_URL = "http://localhost:1234/v1"


class LMStudioError(RuntimeError):
    pass


class LMStudioClient:
    def __init__(self, base_url: str | None = None, model: str | None = None,
                 timeout: int = 300):
        self.base_url = (base_url or os.environ.get("GORILA_LMSTUDIO_URL")
                         or DEFAULT_BASE_URL).rstrip("/")
        self.model = model
        self.timeout = timeout

    def _request(self, path: str, payload: dict | None = None) -> dict:
        url = f"{self.base_url}{path}"
        data = json.dumps(payload).encode() if payload is not None else None
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST" if data else "GET",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            detail = ""
            try:
                detail = e.read().decode()[:500]
            except Exception:
                pass
            raise LMStudioError(
                f"LM Studio rejected the request ({e.code}): {detail}"
            ) from e
        except urllib.error.URLError as e:
            raise LMStudioError(
                f"LM Studio unreachable at {self.base_url} ({e}). "
                "Start the LM Studio local server (Developer tab) first."
            ) from e

    def models(self) -> list[str]:
        return [m["id"] for m in self._request("/models").get("data", [])]

    def pick_model(self) -> str:
        """Choose the configured model, else the first non-embedding model."""
        if self.model:
            return self.model
        for mid in self.models():
            if "embed" not in mid.lower():
                self.model = mid
                return mid
        raise LMStudioError("No chat-capable model loaded in LM Studio.")

    def chat(self, system: str, user: str, temperature: float = 0.4,
             max_tokens: int = 1200) -> str:
        model = self.pick_model()
        resp = self._request(
            "/chat/completions",
            {
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        try:
            return resp["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise LMStudioError(f"Malformed response: {resp}") from e
