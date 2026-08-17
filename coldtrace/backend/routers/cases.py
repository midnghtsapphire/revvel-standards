"""Cases router — CRUD for investigation cases."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from ..models.case import Case, CaseCreate, CaseUpdate

router = APIRouter()

# In-memory store (replace with PostgreSQL + PostGIS in production)
_cases: dict[str, Case] = {}


@router.get("/", response_model=list[Case])
async def list_cases() -> list[Case]:
    return list(_cases.values())


@router.post("/", response_model=Case, status_code=201)
async def create_case(body: CaseCreate) -> Case:
    import uuid
    case = Case(id=str(uuid.uuid4()), **body.model_dump())
    _cases[case.id] = case
    return case


@router.get("/{case_id}", response_model=Case)
async def get_case(case_id: str) -> Case:
    case = _cases.get(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    return case


@router.patch("/{case_id}", response_model=Case)
async def update_case(case_id: str, body: CaseUpdate) -> Case:
    case = _cases.get(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    updates = body.model_dump(exclude_unset=True)
    updated = case.model_copy(update=updates)
    _cases[case_id] = updated
    return updated


@router.delete("/{case_id}", status_code=204)
async def delete_case(case_id: str) -> None:
    if case_id not in _cases:
        raise HTTPException(status_code=404, detail="Case not found.")
    del _cases[case_id]
