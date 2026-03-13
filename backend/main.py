from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import chatbot, blood_risk, symptom_risk, hospital_booking, admin_dashboard, auth
from models.blood_model import train_and_save_model
from services.database_service import init_db, seed_default_auth_users

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
    app.include_router(hospital_booking.router, prefix="/api/v1/hospital-booking", tags=["Hospital Booking"])
    app.include_router(admin_dashboard.router, prefix="/api/v1/admin-dashboard", tags=["Admin Dashboard"])
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])

    @app.on_event("startup")
    async def startup_event():
        init_db(settings.SQLITE_DB_PATH)
        seed_default_auth_users(
            db_path=settings.SQLITE_DB_PATH,
            admin_email=settings.DEFAULT_ADMIN_EMAIL,
            admin_password=settings.DEFAULT_ADMIN_PASSWORD,
            manager_email=settings.DEFAULT_MANAGER_EMAIL,
            manager_password=settings.DEFAULT_MANAGER_PASSWORD,
        )
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
