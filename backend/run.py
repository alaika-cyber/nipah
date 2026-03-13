"""Convenience runner for the FastAPI backend."""

from __future__ import annotations

import os

import uvicorn

from config import settings


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=settings.DEBUG,
    )
