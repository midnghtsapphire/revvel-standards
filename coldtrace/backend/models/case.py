"""Pydantic models for investigation cases."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


class CaseBase(BaseModel):
    case_number: str = Field(..., description="Case identifier e.g. CT-2026-001")
    title: str = Field(..., description="Case title or subject name")
    agency: str | None = None
    investigator: str | None = None
    notes: str | None = None
    tags: list[str] = []


class CaseCreate(CaseBase):
    pass


class CaseUpdate(BaseModel):
    title: str | None = None
    agency: str | None = None
    investigator: str | None = None
    notes: str | None = None
    tags: list[str] | None = None


class Case(CaseBase):
    id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    analysis_jobs: list[str] = []
