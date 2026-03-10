from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import chatbot, blood_risk, symptom_risk
from models.blood_model import train_and_save_model

import os


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AI-powered Nipah virus awareness and risk assessment platform",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(chatbot.router, prefix="/api/v1/chat", tags=["Chatbot"])
    app.include_router(blood_risk.router, prefix="/api/v1/blood-risk", tags=["Blood Risk"])
    app.include_router(symptom_risk.router, prefix="/api/v1/symptom-risk", tags=["Symptom Risk"])

    @app.on_event("startup")
    async def startup_event():
        if not os.path.exists(settings.ML_MODEL_PATH):
            print("Training blood risk ML model...")
            train_and_save_model(settings.ML_MODEL_PATH)
            print("Model trained and saved.")

    @app.get("/api/v1/health")
    async def health_check():
        return {"status": "healthy", "version": settings.APP_VERSION}

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)
