"""Symptom-Based Risk Assessment API router — Module 3."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from config import settings
from models.symptom_engine import assess_symptoms, get_symptom_catalog
from services.database_service import save_symptom_assessment

router = APIRouter()


class SymptomRequest(BaseModel):
    symptoms: list[str] = Field(
        ...,
        min_length=1,
        max_length=20,
        description="List of symptom IDs selected by the user",
    )


@router.post("/assess")
async def assess_risk(request: SymptomRequest):
    """Assess Nipah virus risk based on reported symptoms."""
    result = assess_symptoms(request.symptoms)
    result_data = result.model_dump()

    try:
        save_symptom_assessment(
            db_path=settings.SQLITE_DB_PATH,
            selected_symptoms=request.symptoms,
            result=result_data,
        )
    except Exception:
        # Persistence should not block risk assessment responses.
        pass

    return result_data


@router.get("/symptoms")
async def list_symptoms():
    """Get the full catalog of symptoms available for assessment."""
    catalog = get_symptom_catalog()

    # Group by category
    categories = {}
    for symptom in catalog:
        cat = symptom["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(symptom)

    return {
        "categories": categories,
        "total_symptoms": len(catalog),
    }
