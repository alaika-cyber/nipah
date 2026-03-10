"""Symptom-Based Risk Assessment Engine for Nipah Virus.

Uses a weighted scoring algorithm based on published clinical
presentations of Nipah virus infection. Symptoms are categorized
by their diagnostic significance and weighted accordingly.
"""

from pydantic import BaseModel

# Symptom definitions with weights and categories
SYMPTOM_CATALOG = {
    # --- Neurological (highest weight — hallmark of Nipah encephalitis) ---
    "altered_consciousness": {"label": "Altered consciousness / Confusion", "weight": 10, "category": "neurological"},
    "seizures": {"label": "Seizures", "weight": 10, "category": "neurological"},
    "disorientation": {"label": "Disorientation", "weight": 8, "category": "neurological"},
    "drowsiness": {"label": "Excessive drowsiness / Lethargy", "weight": 7, "category": "neurological"},
    "neck_stiffness": {"label": "Neck stiffness (meningismus)", "weight": 8, "category": "neurological"},

    # --- Respiratory (common in Nipah, can indicate atypical pneumonia) ---
    "difficulty_breathing": {"label": "Difficulty breathing", "weight": 7, "category": "respiratory"},
    "cough": {"label": "Cough", "weight": 4, "category": "respiratory"},
    "sore_throat": {"label": "Sore throat", "weight": 3, "category": "respiratory"},

    # --- General / Systemic ---
    "fever": {"label": "Fever (≥38°C / 100.4°F)", "weight": 5, "category": "general"},
    "headache": {"label": "Severe headache", "weight": 4, "category": "general"},
    "vomiting": {"label": "Vomiting / Nausea", "weight": 4, "category": "general"},
    "muscle_pain": {"label": "Muscle pain (myalgia)", "weight": 3, "category": "general"},
    "fatigue": {"label": "Extreme fatigue", "weight": 3, "category": "general"},
    "dizziness": {"label": "Dizziness", "weight": 3, "category": "general"},
    "abdominal_pain": {"label": "Abdominal pain", "weight": 2, "category": "general"},

    # --- Exposure risk factors (modifiers) ---
    "contact_bats": {"label": "Recent contact with bats or bat habitats", "weight": 8, "category": "exposure"},
    "contact_pigs": {"label": "Contact with pigs in endemic area", "weight": 7, "category": "exposure"},
    "raw_date_palm_sap": {"label": "Consumed raw date palm sap", "weight": 8, "category": "exposure"},
    "contact_patient": {"label": "Close contact with suspected/confirmed Nipah patient", "weight": 9, "category": "exposure"},
    "endemic_area": {"label": "Lives in or traveled to Nipah-endemic area", "weight": 5, "category": "exposure"},
}

# Risk thresholds
SAFE_THRESHOLD = 10
LOW_RISK_THRESHOLD = 25


class SymptomAssessmentResult(BaseModel):
    risk_level: str
    risk_score: int
    max_possible_score: int
    risk_percentage: float
    matched_symptoms: list[dict]
    recommendation: str
    disclaimer: str


def get_symptom_catalog() -> list[dict]:
    """Return the full symptom catalog for the frontend."""
    return [
        {
            "id": symptom_id,
            "label": info["label"],
            "category": info["category"],
            "weight": info["weight"],
        }
        for symptom_id, info in SYMPTOM_CATALOG.items()
    ]


def assess_symptoms(selected_symptoms: list[str]) -> SymptomAssessmentResult:
    """Assess risk based on selected symptoms using weighted scoring."""
    total_score = 0
    matched = []
    has_neurological = False
    has_respiratory = False
    has_exposure = False
    has_fever = False

    max_possible = sum(info["weight"] for info in SYMPTOM_CATALOG.values())

    for symptom_id in selected_symptoms:
        if symptom_id in SYMPTOM_CATALOG:
            info = SYMPTOM_CATALOG[symptom_id]
            total_score += info["weight"]
            matched.append({
                "id": symptom_id,
                "label": info["label"],
                "weight": info["weight"],
                "category": info["category"],
            })

            if info["category"] == "neurological":
                has_neurological = True
            elif info["category"] == "respiratory":
                has_respiratory = True
            elif info["category"] == "exposure":
                has_exposure = True
            if symptom_id == "fever":
                has_fever = True

    # Apply combination bonuses for clinical patterns
    # Fever + neurological symptoms = classic Nipah presentation
    if has_fever and has_neurological:
        total_score = int(total_score * 1.3)

    # Exposure + any symptoms = significantly higher risk
    if has_exposure and total_score > SAFE_THRESHOLD:
        total_score = int(total_score * 1.2)

    # Neurological + respiratory = severe presentation
    if has_neurological and has_respiratory:
        total_score = int(total_score * 1.15)

    risk_percentage = round(min(total_score / max_possible * 100, 100), 1)

    # Determine risk level
    if total_score <= SAFE_THRESHOLD:
        risk_level = "Safe"
        recommendation = (
            "Based on the symptoms provided, the risk appears low. "
            "Continue monitoring your health and maintain good hygiene practices. "
            "If symptoms worsen or new symptoms develop, consult a healthcare provider."
        )
    elif total_score <= LOW_RISK_THRESHOLD:
        risk_level = "Low Risk"
        recommendation = (
            "Some of the reported symptoms may be associated with various infections. "
            "While Nipah-specific risk is low, it is advisable to consult a healthcare "
            "provider for a proper evaluation, especially if you have been in an endemic "
            "area or had potential exposure."
        )
    else:
        risk_level = "High Risk"
        recommendation = (
            "The combination of symptoms reported warrants immediate medical attention. "
            "Please visit the nearest hospital or contact your local health authority "
            "immediately. Inform healthcare providers about any potential exposure to "
            "bats, pigs, or contact with suspected Nipah patients. "
            "Self-isolate and avoid close contact with others until medically evaluated."
        )

    return SymptomAssessmentResult(
        risk_level=risk_level,
        risk_score=total_score,
        max_possible_score=max_possible,
        risk_percentage=risk_percentage,
        matched_symptoms=matched,
        recommendation=recommendation,
        disclaimer=(
            "⚠️ DISCLAIMER: This assessment is for EDUCATIONAL PURPOSES ONLY and does NOT "
            "constitute a medical diagnosis. Nipah virus infection can only be confirmed "
            "through laboratory testing. Always consult qualified healthcare professionals "
            "for medical advice, diagnosis, and treatment."
        ),
    )
