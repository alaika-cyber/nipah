"""SQLite persistence service for chat and risk assessments."""

from __future__ import annotations

import json
import math
import os
import sqlite3
import hashlib
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator


@contextmanager
def _connect(db_path: str) -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(db_path)
    try:
        conn.row_factory = sqlite3.Row
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(db_path: str) -> None:
    """Create required SQLite tables if they do not exist."""
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    with _connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_message TEXT NOT NULL,
                assistant_response TEXT NOT NULL,
                used_llm INTEGER NOT NULL,
                llm_model TEXT,
                created_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS blood_assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                input_parameters TEXT NOT NULL,
                prediction TEXT NOT NULL,
                risk_level INTEGER NOT NULL,
                probabilities TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS symptom_assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                selected_symptoms TEXT NOT NULL,
                result TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS hospitals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                address TEXT NOT NULL,
                city TEXT NOT NULL,
                contact TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                manager_username TEXT NOT NULL UNIQUE,
                manager_password TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS doctors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hospital_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                specialization TEXT NOT NULL,
                contact TEXT NOT NULL,
                availability TEXT NOT NULL,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(hospital_id) REFERENCES hospitals(id)
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_name TEXT NOT NULL,
                patient_contact TEXT NOT NULL,
                hospital_id INTEGER NOT NULL,
                doctor_id INTEGER NOT NULL,
                appointment_date TEXT NOT NULL,
                appointment_time TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'booked',
                notes TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(hospital_id) REFERENCES hospitals(id),
                FOREIGN KEY(doctor_id) REFERENCES doctors(id)
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS state_statistics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                state_name TEXT NOT NULL UNIQUE,
                active_cases INTEGER NOT NULL,
                deaths INTEGER NOT NULL,
                updated_by TEXT NOT NULL,
                last_updated TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                email TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'approved',
                created_at TEXT NOT NULL,
                UNIQUE(role, email)
            )
            """
        )

        # Lightweight migration for older DBs created before 'status' existed.
        columns = [r["name"] for r in conn.execute("PRAGMA table_info(auth_users)").fetchall()]
        if "status" not in columns:
            conn.execute("ALTER TABLE auth_users ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in KM between two coordinate pairs."""
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def _compute_zone(active_cases: int, deaths: int) -> str:
    severity_score = active_cases + (deaths * 2)
    if severity_score >= 100 or deaths >= 20:
        return "Red"
    if severity_score >= 25 or deaths >= 5:
        return "Orange"
    return "Green"


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def seed_default_auth_users(
    db_path: str,
    admin_email: str,
    admin_password: str,
    manager_email: str,
    manager_password: str,
) -> None:
    """Seed default admin and manager credentials from environment."""
    with _connect(db_path) as conn:
        for role, email, password in [
            ("admin", admin_email.strip().lower(), admin_password),
            ("manager", manager_email.strip().lower(), manager_password),
        ]:
            if not email or not password:
                continue

            exists = conn.execute(
                "SELECT id FROM auth_users WHERE role = ? AND email = ?",
                (role, email),
            ).fetchone()
            if exists:
                continue

            conn.execute(
                """
                INSERT INTO auth_users (role, email, password_hash, status, created_at)
                VALUES (?, ?, ?, 'approved', ?)
                """,
                (role, email, _hash_password(password), _now_iso()),
            )


def register_auth_user(db_path: str, role: str, email: str, password: str) -> dict[str, Any]:
    normalized_role = role.strip().lower()
    normalized_email = email.strip().lower()

    if normalized_role != "manager":
        raise ValueError("Only manager signup is allowed. Admin is login-only")

    with _connect(db_path) as conn:
        exists = conn.execute(
            "SELECT id FROM auth_users WHERE role = ? AND email = ?",
            (normalized_role, normalized_email),
        ).fetchone()
        if exists:
            raise ValueError("User already exists for this role and email")

        conn.execute(
            """
            INSERT INTO auth_users (role, email, password_hash, status, created_at)
            VALUES (?, ?, ?, 'pending', ?)
            """,
            (normalized_role, normalized_email, _hash_password(password), _now_iso()),
        )

    return {
        "role": normalized_role,
        "email": normalized_email,
        "status": "pending",
    }


def login_auth_user(db_path: str, role: str, email: str, password: str) -> dict[str, Any] | None:
    normalized_role = role.strip().lower()
    normalized_email = email.strip().lower()

    with _connect(db_path) as conn:
        row = conn.execute(
            """
            SELECT role, email, status
            FROM auth_users
            WHERE role = ? AND email = ? AND password_hash = ?
            """,
            (normalized_role, normalized_email, _hash_password(password)),
        ).fetchone()

    if not row:
        return None

    return {
        "role": str(row["role"]),
        "email": str(row["email"]),
        "status": str(row["status"]),
    }


def _assert_admin_credentials(db_path: str, admin_email: str, admin_password: str) -> None:
    admin = login_auth_user(db_path, "admin", admin_email, admin_password)
    if not admin or admin.get("status") != "approved":
        raise ValueError("Invalid admin credentials")


def list_pending_manager_requests(
    db_path: str,
    admin_email: str,
    admin_password: str,
) -> list[dict[str, Any]]:
    _assert_admin_credentials(db_path, admin_email, admin_password)

    with _connect(db_path) as conn:
        rows = conn.execute(
            """
            SELECT email, role, status, created_at
            FROM auth_users
            WHERE role = 'manager' AND status = 'pending'
            ORDER BY created_at ASC
            """
        ).fetchall()

    return [dict(r) for r in rows]


def approve_manager_request(
    db_path: str,
    admin_email: str,
    admin_password: str,
    manager_email: str,
) -> dict[str, Any]:
    _assert_admin_credentials(db_path, admin_email, admin_password)

    normalized_manager = manager_email.strip().lower()

    with _connect(db_path) as conn:
        existing = conn.execute(
            """
            SELECT email, status
            FROM auth_users
            WHERE role = 'manager' AND email = ?
            """,
            (normalized_manager,),
        ).fetchone()

        if not existing:
            raise ValueError("Manager request not found")

        conn.execute(
            """
            UPDATE auth_users
            SET status = 'approved'
            WHERE role = 'manager' AND email = ?
            """,
            (normalized_manager,),
        )

    return {
        "role": "manager",
        "email": normalized_manager,
        "status": "approved",
    }


def save_chat_interaction(
    db_path: str,
    user_message: str,
    assistant_response: str,
    used_llm: bool,
    llm_model: str | None,
) -> None:
    with _connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO chat_interactions
                (user_message, assistant_response, used_llm, llm_model, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_message, assistant_response, int(used_llm), llm_model, _now_iso()),
        )


def save_blood_assessment(
    db_path: str,
    input_parameters: dict[str, float],
    prediction: str,
    risk_level: int,
    probabilities: dict[str, float],
) -> None:
    with _connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO blood_assessments
                (input_parameters, prediction, risk_level, probabilities, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                json.dumps(input_parameters, separators=(",", ":")),
                prediction,
                risk_level,
                json.dumps(probabilities, separators=(",", ":")),
                _now_iso(),
            ),
        )


def save_symptom_assessment(
    db_path: str,
    selected_symptoms: list[str],
    result: dict[str, Any],
) -> None:
    with _connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO symptom_assessments
                (selected_symptoms, result, created_at)
            VALUES (?, ?, ?)
            """,
            (
                json.dumps(selected_symptoms, separators=(",", ":")),
                json.dumps(result, separators=(",", ":")),
                _now_iso(),
            ),
        )


def create_hospital(
    db_path: str,
    name: str,
    address: str,
    city: str,
    contact: str,
    latitude: float,
    longitude: float,
    manager_username: str,
    manager_password: str,
) -> dict[str, Any]:
    created_at = _now_iso()
    with _connect(db_path) as conn:
        cur = conn.execute(
            """
            INSERT INTO hospitals
                (name, address, city, contact, latitude, longitude, manager_username, manager_password, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                address,
                city,
                contact,
                latitude,
                longitude,
                manager_username,
                manager_password,
                created_at,
            ),
        )
        hospital_id = int(cur.lastrowid)

    return {
        "id": hospital_id,
        "name": name,
        "address": address,
        "city": city,
        "contact": contact,
        "latitude": latitude,
        "longitude": longitude,
        "manager_username": manager_username,
        "created_at": created_at,
    }


def list_hospitals(
    db_path: str,
    city: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    radius_km: float | None = None,
) -> list[dict[str, Any]]:
    params: list[Any] = []
    query = """
        SELECT id, name, address, city, contact, latitude, longitude, manager_username, created_at
        FROM hospitals
    """

    if city:
        query += " WHERE LOWER(city) = LOWER(?)"
        params.append(city)

    query += " ORDER BY city ASC, name ASC"

    with _connect(db_path) as conn:
        rows = [dict(r) for r in conn.execute(query, tuple(params)).fetchall()]

    if latitude is not None and longitude is not None:
        for row in rows:
            row["distance_km"] = round(
                _haversine_km(latitude, longitude, row["latitude"], row["longitude"]),
                2,
            )
        rows.sort(key=lambda x: x["distance_km"])

        if radius_km is not None:
            rows = [r for r in rows if r["distance_km"] <= radius_km]

    return rows


def create_doctor(
    db_path: str,
    hospital_id: int,
    name: str,
    specialization: str,
    contact: str,
    availability: dict[str, list[str]],
    username: str,
    password: str,
) -> dict[str, Any]:
    created_at = _now_iso()
    with _connect(db_path) as conn:
        hospital = conn.execute(
            "SELECT id FROM hospitals WHERE id = ?",
            (hospital_id,),
        ).fetchone()
        if not hospital:
            raise ValueError("Hospital not found")

        cur = conn.execute(
            """
            INSERT INTO doctors
                (hospital_id, name, specialization, contact, availability, username, password, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                hospital_id,
                name,
                specialization,
                contact,
                json.dumps(availability, separators=(",", ":")),
                username,
                password,
                created_at,
            ),
        )
        doctor_id = int(cur.lastrowid)

    return {
        "id": doctor_id,
        "hospital_id": hospital_id,
        "name": name,
        "specialization": specialization,
        "contact": contact,
        "availability": availability,
        "username": username,
        "created_at": created_at,
    }


def list_doctors(db_path: str, hospital_id: int | None = None) -> list[dict[str, Any]]:
    query = """
        SELECT d.id, d.hospital_id, h.name AS hospital_name, d.name, d.specialization,
               d.contact, d.availability, d.username, d.created_at
        FROM doctors d
        JOIN hospitals h ON h.id = d.hospital_id
    """
    params: tuple[Any, ...] = ()
    if hospital_id is not None:
        query += " WHERE d.hospital_id = ?"
        params = (hospital_id,)

    query += " ORDER BY d.name ASC"

    with _connect(db_path) as conn:
        rows = [dict(r) for r in conn.execute(query, params).fetchall()]

    for row in rows:
        row["availability"] = json.loads(row["availability"])

    return rows


def create_appointment(
    db_path: str,
    patient_name: str,
    patient_contact: str,
    hospital_id: int,
    doctor_id: int,
    appointment_date: str,
    appointment_time: str,
    notes: str | None = None,
) -> dict[str, Any]:
    created_at = _now_iso()
    with _connect(db_path) as conn:
        doctor = conn.execute(
            "SELECT id, hospital_id FROM doctors WHERE id = ?",
            (doctor_id,),
        ).fetchone()
        if not doctor:
            raise ValueError("Doctor not found")
        if int(doctor["hospital_id"]) != hospital_id:
            raise ValueError("Doctor does not belong to selected hospital")

        existing = conn.execute(
            """
            SELECT id FROM appointments
            WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ?
            """,
            (doctor_id, appointment_date, appointment_time),
        ).fetchone()
        if existing:
            raise ValueError("Selected time slot is already booked")

        cur = conn.execute(
            """
            INSERT INTO appointments
                (patient_name, patient_contact, hospital_id, doctor_id, appointment_date, appointment_time, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                patient_name,
                patient_contact,
                hospital_id,
                doctor_id,
                appointment_date,
                appointment_time,
                notes,
                created_at,
            ),
        )
        appointment_id = int(cur.lastrowid)

    return {
        "id": appointment_id,
        "patient_name": patient_name,
        "patient_contact": patient_contact,
        "hospital_id": hospital_id,
        "doctor_id": doctor_id,
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "status": "booked",
        "notes": notes,
        "created_at": created_at,
    }


def list_appointments_for_manager(db_path: str, manager_username: str) -> list[dict[str, Any]]:
    with _connect(db_path) as conn:
        rows = conn.execute(
            """
            SELECT a.id, a.patient_name, a.patient_contact, a.hospital_id, h.name AS hospital_name,
                   a.doctor_id, d.name AS doctor_name, d.specialization, a.appointment_date,
                   a.appointment_time, a.status, a.notes, a.created_at
            FROM appointments a
            JOIN hospitals h ON h.id = a.hospital_id
            JOIN doctors d ON d.id = a.doctor_id
            WHERE h.manager_username = ?
            ORDER BY a.appointment_date ASC, a.appointment_time ASC
            """,
            (manager_username,),
        ).fetchall()

    return [dict(r) for r in rows]


def list_booked_slots(
    db_path: str,
    doctor_id: int,
    appointment_date: str,
) -> list[str]:
    with _connect(db_path) as conn:
        rows = conn.execute(
            """
            SELECT appointment_time
            FROM appointments
            WHERE doctor_id = ? AND appointment_date = ?
            ORDER BY appointment_time ASC
            """,
            (doctor_id, appointment_date),
        ).fetchall()
    return [str(r["appointment_time"]) for r in rows]


def upsert_state_stat(
    db_path: str,
    state_name: str,
    active_cases: int,
    deaths: int,
    updated_by: str,
) -> dict[str, Any]:
    now = _now_iso()
    with _connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO state_statistics
                (state_name, active_cases, deaths, updated_by, last_updated, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(state_name)
            DO UPDATE SET
                active_cases = excluded.active_cases,
                deaths = excluded.deaths,
                updated_by = excluded.updated_by,
                last_updated = excluded.last_updated
            """,
            (state_name, active_cases, deaths, updated_by, now, now),
        )

    return {
        "state_name": state_name,
        "active_cases": active_cases,
        "deaths": deaths,
        "zone": _compute_zone(active_cases, deaths),
        "updated_by": updated_by,
        "last_updated": now,
    }


def list_state_stats(db_path: str) -> list[dict[str, Any]]:
    with _connect(db_path) as conn:
        rows = conn.execute(
            """
            SELECT state_name, active_cases, deaths, updated_by, last_updated
            FROM state_statistics
            ORDER BY active_cases DESC, deaths DESC, state_name ASC
            """
        ).fetchall()

    output: list[dict[str, Any]] = []
    for row in rows:
        active_cases = int(row["active_cases"])
        deaths = int(row["deaths"])
        output.append(
            {
                "state_name": str(row["state_name"]),
                "active_cases": active_cases,
                "deaths": deaths,
                "zone": _compute_zone(active_cases, deaths),
                "updated_by": str(row["updated_by"]),
                "last_updated": str(row["last_updated"]),
            }
        )

    return output
