"""Admin dashboard and red-zone monitoring APIs (Module 5)."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config import settings
from services.database_service import list_state_stats, upsert_state_stat

router = APIRouter()


class StateStatUpdateRequest(BaseModel):
    state_name: str = Field(..., min_length=2, max_length=120)
    active_cases: int = Field(..., ge=0)
    deaths: int = Field(..., ge=0)
    updated_by: str = Field(default="admin", min_length=3, max_length=80)


@router.post("/admin/state-stats")
async def update_state_stats(request: StateStatUpdateRequest):
    """Admin updates active case and death statistics for a state."""
    try:
        result = upsert_state_stat(
            db_path=settings.SQLITE_DB_PATH,
            state_name=request.state_name,
            active_cases=request.active_cases,
            deaths=request.deaths,
            updated_by=request.updated_by,
        )
        return {
            "message": "State statistics updated",
            "state": result,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update state statistics: {str(exc)}")


@router.get("/state-stats")
async def get_state_stats():
    """Public read-only state-wise statistics and zones."""
    states = list_state_stats(settings.SQLITE_DB_PATH)
    return {
        "states": states,
        "total_states": len(states),
    }


@router.get("/zone-summary")
async def get_zone_summary():
    """Public summary of red/orange/green zones and totals."""
    states = list_state_stats(settings.SQLITE_DB_PATH)
    summary = {"Red": 0, "Orange": 0, "Green": 0}
    total_active_cases = 0
    total_deaths = 0

    for state in states:
        zone = state["zone"]
        summary[zone] += 1
        total_active_cases += state["active_cases"]
        total_deaths += state["deaths"]

    return {
        "zones": summary,
        "total_states": len(states),
        "total_active_cases": total_active_cases,
        "total_deaths": total_deaths,
    }
