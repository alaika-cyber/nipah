"""Role authentication router for manager/admin access control."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config import settings
from services.database_service import (
    approve_manager_request,
    list_pending_manager_requests,
    login_auth_user,
    login_hospital_manager,
    register_auth_user,
)

router = APIRouter()


class AuthRequest(BaseModel):
    role: str = Field(..., pattern="^(admin|manager)$")
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=6, max_length=120)


class AdminCredentialRequest(BaseModel):
    admin_email: str = Field(..., min_length=5, max_length=120)
    admin_password: str = Field(..., min_length=6, max_length=120)


class AdminApprovalRequest(AdminCredentialRequest):
    manager_email: str = Field(..., min_length=5, max_length=120)


@router.post("/signup")
async def signup(request: AuthRequest):
    if request.role != "manager":
        raise HTTPException(status_code=400, detail="Admin is login-only")

    try:
        user = register_auth_user(
            db_path=settings.SQLITE_DB_PATH,
            role=request.role,
            email=request.email,
            password=request.password,
        )
        return {
            "message": "Signup request submitted. Waiting for admin approval.",
            "user": user,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(exc)}")


@router.post("/login")
async def login(request: AuthRequest):
    user = login_auth_user(
        db_path=settings.SQLITE_DB_PATH,
        role=request.role,
        email=request.email,
        password=request.password,
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user["role"] == "manager" and user["status"] != "approved":
        raise HTTPException(status_code=403, detail="Manager account is pending admin approval")

    return {"message": "Login successful", "user": user}


class HospitalLoginRequest(BaseModel):
    username: str = Field(..., min_length=4, max_length=120)
    password: str = Field(..., min_length=6, max_length=120)


@router.post("/hospital/login")
async def hospital_login(request: HospitalLoginRequest):
    user = login_hospital_manager(
        db_path=settings.SQLITE_DB_PATH,
        username=request.username,
        password=request.password,
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid hospital manager credentials")

    return {"message": "Hospital manager login successful", "user": user}


@router.post("/admin/pending-managers")
async def get_pending_managers(request: AdminCredentialRequest):
    try:
        pending = list_pending_manager_requests(
            db_path=settings.SQLITE_DB_PATH,
            admin_email=request.admin_email,
            admin_password=request.admin_password,
        )
        return {"pending_requests": pending, "total": len(pending)}
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load requests: {str(exc)}")


@router.post("/admin/approve-manager")
async def approve_manager(request: AdminApprovalRequest):
    try:
        approved = approve_manager_request(
            db_path=settings.SQLITE_DB_PATH,
            admin_email=request.admin_email,
            admin_password=request.admin_password,
            manager_email=request.manager_email,
        )
        return {"message": "Manager approved successfully", "manager": approved}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to approve manager: {str(exc)}")
