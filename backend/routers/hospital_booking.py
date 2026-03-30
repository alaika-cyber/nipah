"""Hospital discovery and appointment booking APIs (Module 4)."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from config import settings
from services.database_service import (
    create_appointment,
    create_doctor,
    create_hospital,
    list_appointments_for_manager,
    list_booked_slots,
    list_doctors,
    list_hospitals,
)

router = APIRouter()


class HospitalCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    address: str = Field(..., min_length=5, max_length=250)
    city: str = Field(..., min_length=2, max_length=80)
    contact: str = Field(..., min_length=5, max_length=80)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    manager_username: str = Field(..., min_length=4, max_length=40)
    manager_password: str = Field(..., min_length=6, max_length=80)
    admin_email: str = Field(..., min_length=5, max_length=120)
    admin_password: str = Field(..., min_length=6, max_length=120)


class DoctorCreateRequest(BaseModel):
    hospital_id: int = Field(..., ge=1)
    manager_username: str = Field(..., min_length=4, max_length=40)
    manager_password: str = Field(..., min_length=6, max_length=80)
    name: str = Field(..., min_length=2, max_length=120)
    specialization: str = Field(..., min_length=2, max_length=120)
    contact: str = Field(..., min_length=5, max_length=80)
    availability: dict[str, list[str]] = Field(
        ...,
        description="Weekly schedule, e.g. {\"Monday\": [\"10:00\", \"11:00\"]}",
    )
    username: str = Field(..., min_length=4, max_length=40)
    password: str = Field(..., min_length=6, max_length=80)


class AdminDoctorCreateRequest(BaseModel):
    hospital_id: int = Field(..., ge=1)
    admin_email: str = Field(..., min_length=5, max_length=120)
    admin_password: str = Field(..., min_length=6, max_length=120)
    name: str = Field(..., min_length=2, max_length=120)
    specialization: str = Field(..., min_length=2, max_length=120)
    contact: str = Field(..., min_length=5, max_length=80)
    availability: dict[str, list[str]] = Field(
        ...,
        description="Weekly schedule, e.g. {\"Monday\": [\"10:00\", \"11:00\"]}",
    )
    username: str = Field(..., min_length=4, max_length=40)
    password: str = Field(..., min_length=6, max_length=80)


class AppointmentRequest(BaseModel):
    patient_name: str = Field(..., min_length=2, max_length=120)
    patient_contact: str = Field(..., min_length=5, max_length=80)
    hospital_id: int = Field(..., ge=1)
    doctor_id: int = Field(..., ge=1)
    appointment_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    appointment_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    notes: str | None = Field(default=None, max_length=500)


@router.post("/admin/hospitals")
async def register_hospital(request: HospitalCreateRequest):
    """Admin registers a hospital and manager credentials."""
    from services.database_service import _assert_admin_credentials
    try:
        _assert_admin_credentials(
            db_path=settings.SQLITE_DB_PATH,
            admin_email=request.admin_email,
            admin_password=request.admin_password,
        )
        created = create_hospital(
            db_path=settings.SQLITE_DB_PATH,
            name=request.name,
            address=request.address,
            city=request.city,
            contact=request.contact,
            latitude=request.latitude,
            longitude=request.longitude,
            manager_username=request.manager_username,
            manager_password=request.manager_password,
        )
        return {
            "message": "Hospital registered successfully",
            "hospital": created,
            "manager_credentials": {
                "username": request.manager_username,
                "password": request.manager_password,
            },
        }
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to register hospital: {str(exc)}")


@router.post("/manager/doctors")
async def register_doctor(request: DoctorCreateRequest):
    """Hospital manager registers a doctor under their hospital."""
    from services.database_service import _assert_hospital_manager_credentials
    try:
        _assert_hospital_manager_credentials(
            db_path=settings.SQLITE_DB_PATH,
            username=request.manager_username,
            password=request.manager_password,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))

    hospitals = list_hospitals(settings.SQLITE_DB_PATH)
    match = next((h for h in hospitals if h["id"] == request.hospital_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Hospital not found")
    if match["manager_username"] != request.manager_username:
        raise HTTPException(status_code=403, detail="Manager is not authorized for this hospital")

    try:
        created = create_doctor(
            db_path=settings.SQLITE_DB_PATH,
            hospital_id=request.hospital_id,
            name=request.name,
            specialization=request.specialization,
            contact=request.contact,
            availability=request.availability,
            username=request.username,
            password=request.password,
        )
        return {
            "message": "Doctor registered successfully",
            "doctor": created,
            "doctor_credentials": {
                "username": request.username,
                "password": request.password,
            },
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to register doctor: {str(exc)}")


@router.post("/admin/doctors")
async def register_doctor_as_admin(request: AdminDoctorCreateRequest):
    """Admin registers a doctor under any hospital without needing manager credentials."""
    from services.database_service import _assert_admin_credentials
    try:
        _assert_admin_credentials(
            db_path=settings.SQLITE_DB_PATH,
            admin_email=request.admin_email,
            admin_password=request.admin_password,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))

    hospitals = list_hospitals(settings.SQLITE_DB_PATH)
    match = next((h for h in hospitals if h["id"] == request.hospital_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Hospital not found")

    try:
        created = create_doctor(
            db_path=settings.SQLITE_DB_PATH,
            hospital_id=request.hospital_id,
            name=request.name,
            specialization=request.specialization,
            contact=request.contact,
            availability=request.availability,
            username=request.username,
            password=request.password,
        )
        return {
            "message": "Doctor registered successfully",
            "doctor": created,
            "doctor_credentials": {
                "username": request.username,
                "password": request.password,
            },
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to register doctor: {str(exc)}")


@router.get("/hospitals")
async def get_hospitals(
    city: str | None = Query(default=None),
    latitude: float | None = Query(default=None),
    longitude: float | None = Query(default=None),
    radius_km: float | None = Query(default=None, ge=1, le=500),
):
    """Patient-facing hospital discovery with optional city and nearby filters."""
    hospitals = list_hospitals(
        db_path=settings.SQLITE_DB_PATH,
        city=city,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
    )
    return {"hospitals": hospitals, "total": len(hospitals)}


@router.get("/hospitals/{hospital_id}/doctors")
async def get_hospital_doctors(hospital_id: int):
    doctors = list_doctors(settings.SQLITE_DB_PATH, hospital_id=hospital_id)
    return {"doctors": doctors, "total": len(doctors)}


@router.get("/doctors/{doctor_id}/slots")
async def get_doctor_slots(doctor_id: int, date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$")):
    """Return available slots for a doctor on a date based on schedule minus booked times."""
    doctors = list_doctors(settings.SQLITE_DB_PATH)
    doctor = next((d for d in doctors if d["id"] == doctor_id), None)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    try:
        # Date format is validated above; weekday conversion remains deterministic.
        import datetime

        weekday = datetime.datetime.strptime(date, "%Y-%m-%d").strftime("%A")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    scheduled_slots = doctor["availability"].get(weekday, [])
    booked_slots = list_booked_slots(settings.SQLITE_DB_PATH, doctor_id=doctor_id, appointment_date=date)
    available_slots = [slot for slot in scheduled_slots if slot not in booked_slots]

    return {
        "doctor_id": doctor_id,
        "date": date,
        "weekday": weekday,
        "scheduled_slots": scheduled_slots,
        "booked_slots": booked_slots,
        "available_slots": available_slots,
    }


@router.post("/appointments")
async def book_appointment(request: AppointmentRequest):
    """Patient books an appointment with selected doctor and slot."""
    try:
        appointment = create_appointment(
            db_path=settings.SQLITE_DB_PATH,
            patient_name=request.patient_name,
            patient_contact=request.patient_contact,
            hospital_id=request.hospital_id,
            doctor_id=request.doctor_id,
            appointment_date=request.appointment_date,
            appointment_time=request.appointment_time,
            notes=request.notes,
        )
        return {
            "message": "Appointment booked successfully",
            "appointment": appointment,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to book appointment: {str(exc)}")


class ManagerAppointmentsRequest(BaseModel):
    manager_username: str = Field(..., min_length=4, max_length=40)
    manager_password: str = Field(..., min_length=6, max_length=80)


@router.post("/manager/appointments")
async def get_manager_appointments(request: ManagerAppointmentsRequest):
    """Hospital manager dashboard to view appointments for their hospital."""
    from services.database_service import _assert_hospital_manager_credentials
    try:
        _assert_hospital_manager_credentials(
            db_path=settings.SQLITE_DB_PATH,
            username=request.manager_username,
            password=request.manager_password,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))

    appointments = list_appointments_for_manager(
        settings.SQLITE_DB_PATH, manager_username=request.manager_username
    )
    return {"appointments": appointments, "total": len(appointments)}
