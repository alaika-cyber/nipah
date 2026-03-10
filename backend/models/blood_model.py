"""Blood Parameter Risk Prediction Model for Nipah Virus.

Trains a Random Forest classifier on synthetic data derived from
published medical literature on Nipah virus blood markers.

Key markers:
- WBC: often low (leukopenia) in early stages, can be elevated in advanced
- Platelets: thrombocytopenia is common
- Hemoglobin: may decrease
- AST/ALT: liver enzymes often elevated
- CRP: inflammatory marker, elevated in infection
- Creatinine: may elevate indicating kidney involvement
"""

import os
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import joblib

FEATURE_NAMES = [
    "wbc",         # White Blood Cell count (×10³/µL) — normal: 4.5-11.0
    "platelets",   # Platelet count (×10³/µL) — normal: 150-400
    "hemoglobin",  # Hemoglobin (g/dL) — normal: 12-17
    "ast",         # Aspartate Aminotransferase (U/L) — normal: 10-40
    "alt",         # Alanine Aminotransferase (U/L) — normal: 7-56
    "crp",         # C-Reactive Protein (mg/L) — normal: 0-10
    "creatinine",  # Creatinine (mg/dL) — normal: 0.6-1.2
]

CLASS_NAMES = ["Negative", "Low Risk", "High Risk"]


def _generate_synthetic_data(n_samples: int = 3000, seed: int = 42) -> tuple[np.ndarray, np.ndarray]:
    """Generate synthetic blood parameter data based on Nipah virus literature.

    Class 0 = Negative (normal values)
    Class 1 = Low Risk (mildly abnormal, could indicate early infection)
    Class 2 = High Risk (significantly abnormal, consistent with Nipah)
    """
    rng = np.random.RandomState(seed)

    samples_per_class = n_samples // 3

    # --- Negative (healthy) ---
    negative = np.column_stack([
        rng.normal(7.5, 1.5, samples_per_class),     # WBC: normal range
        rng.normal(250, 50, samples_per_class),       # Platelets: normal
        rng.normal(14.5, 1.2, samples_per_class),     # Hemoglobin: normal
        rng.normal(25, 8, samples_per_class),          # AST: normal
        rng.normal(30, 10, samples_per_class),         # ALT: normal
        rng.exponential(3, samples_per_class),         # CRP: low
        rng.normal(0.9, 0.15, samples_per_class),     # Creatinine: normal
    ])

    # --- Low Risk (mild abnormalities) ---
    low_risk = np.column_stack([
        rng.normal(4.0, 1.0, samples_per_class),      # WBC: mildly low
        rng.normal(130, 30, samples_per_class),        # Platelets: mildly low
        rng.normal(12.5, 1.0, samples_per_class),     # Hemoglobin: borderline low
        rng.normal(55, 15, samples_per_class),         # AST: mildly elevated
        rng.normal(60, 15, samples_per_class),         # ALT: mildly elevated
        rng.normal(25, 10, samples_per_class),         # CRP: moderately elevated
        rng.normal(1.2, 0.2, samples_per_class),      # Creatinine: borderline
    ])

    # --- High Risk (severe abnormalities consistent with Nipah) ---
    high_risk = np.column_stack([
        rng.normal(2.5, 0.8, samples_per_class),      # WBC: severe leukopenia
        rng.normal(70, 25, samples_per_class),         # Platelets: severe thrombocytopenia
        rng.normal(10.5, 1.5, samples_per_class),     # Hemoglobin: low
        rng.normal(120, 40, samples_per_class),        # AST: highly elevated
        rng.normal(110, 35, samples_per_class),        # ALT: highly elevated
        rng.normal(80, 25, samples_per_class),         # CRP: highly elevated
        rng.normal(2.0, 0.5, samples_per_class),      # Creatinine: elevated
    ])

    X = np.vstack([negative, low_risk, high_risk])
    y = np.concatenate([
        np.zeros(samples_per_class),
        np.ones(samples_per_class),
        np.full(samples_per_class, 2),
    ])

    # Clip to physiological bounds
    X[:, 0] = np.clip(X[:, 0], 0.5, 30)    # WBC
    X[:, 1] = np.clip(X[:, 1], 10, 600)     # Platelets
    X[:, 2] = np.clip(X[:, 2], 5, 20)       # Hemoglobin
    X[:, 3] = np.clip(X[:, 3], 5, 500)      # AST
    X[:, 4] = np.clip(X[:, 4], 5, 500)      # ALT
    X[:, 5] = np.clip(X[:, 5], 0, 300)      # CRP
    X[:, 6] = np.clip(X[:, 6], 0.3, 10)     # Creatinine

    # Shuffle
    indices = rng.permutation(len(X))
    return X[indices], y[indices].astype(int)


def train_and_save_model(model_path: str) -> Pipeline:
    """Train a Random Forest model and save it."""
    X, y = _generate_synthetic_data()

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )),
    ])

    pipeline.fit(X, y)

    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(pipeline, model_path)

    return pipeline


def load_model(model_path: str) -> Pipeline:
    """Load a trained model from disk."""
    return joblib.load(model_path)


def predict_risk(model: Pipeline, parameters: dict[str, float]) -> dict:
    """Predict risk level from blood parameters.

    Returns dict with prediction label and probability scores.
    """
    features = np.array([[
        parameters["wbc"],
        parameters["platelets"],
        parameters["hemoglobin"],
        parameters["ast"],
        parameters["alt"],
        parameters["crp"],
        parameters["creatinine"],
    ]])

    prediction = model.predict(features)[0]
    probabilities = model.predict_proba(features)[0]

    return {
        "prediction": CLASS_NAMES[prediction],
        "risk_level": int(prediction),
        "probabilities": {
            CLASS_NAMES[i]: round(float(prob), 4)
            for i, prob in enumerate(probabilities)
        },
        "parameters_analyzed": {
            name: float(features[0][i])
            for i, name in enumerate(FEATURE_NAMES)
        },
    }
