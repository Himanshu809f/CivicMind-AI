"""CivicMind AI — FastAPI reference skeleton.

This file documents the exact HTTP contract the CivicMind frontend expects.
No trained model weights ship with this repository. Every endpoint below must
return HTTP 503 until a real model is loaded — never return invented
confidence values, because the frontend presents them to citizens as real
model output.

Run locally:
    uvicorn app.main:app --reload --port 8000
Then set AI_BACKEND_URL / VITE_AI_BACKEND_URL to this service's base URL.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Optional

app = FastAPI(title="CivicMind AI Service", version="0.1.0")

MODELS_LOADED = False  # flip to True only when real weights are loaded


def require_models() -> None:
    if not MODELS_LOADED:
        raise HTTPException(
            status_code=503,
            detail="AI models are not loaded in this deployment.",
        )


class ImageRequest(BaseModel):
    complaint_id: Optional[str] = None
    image_url: str


class ClassifyRequest(BaseModel):
    title: Optional[str] = ""
    description: str
    language: str = "en"
    image_url: Optional[str] = None


class PriorityRequest(BaseModel):
    category: str
    description: str
    severity: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    historical_context: Optional[dict[str, Any]] = None


class DuplicateRequest(BaseModel):
    description: str
    category: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    candidates: list[dict[str, Any]] = []


class SummaryRequest(BaseModel):
    description: str
    language: str = "en"


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "models_loaded": MODELS_LOADED}


@app.post("/ai/analyze-image")
def analyze_image(_: ImageRequest) -> dict[str, Any]:
    """-> {detected_objects, issue_type, severity, confidence, explanation}"""
    require_models()
    raise HTTPException(status_code=501, detail="Not implemented")


@app.post("/ai/classify")
def classify(_: ClassifyRequest) -> dict[str, Any]:
    """-> {category, subcategory, department, confidence, entities, summary}"""
    require_models()
    raise HTTPException(status_code=501, detail="Not implemented")


@app.post("/ai/priority")
def priority(_: PriorityRequest) -> dict[str, Any]:
    """-> {priority, score, reason, confidence}"""
    require_models()
    raise HTTPException(status_code=501, detail="Not implemented")


@app.post("/ai/duplicate")
def duplicate(_: DuplicateRequest) -> dict[str, Any]:
    """-> {is_duplicate, matched_complaint_id, similarity_score, detection_method}"""
    require_models()
    raise HTTPException(status_code=501, detail="Not implemented")


@app.post("/ai/summary")
def summary(_: SummaryRequest) -> dict[str, Any]:
    """-> {summary, language}"""
    require_models()
    raise HTTPException(status_code=501, detail="Not implemented")
