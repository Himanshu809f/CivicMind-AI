# CivicMind AI — Python / FastAPI inference service (optional)

This folder documents the **contract** for an external AI service. It is not
executed by the web app runtime: the web app is a TypeScript/edge application
and cannot host FastAPI. Deploy this service separately (Docker, Fly.io, Render,
EC2…) and point the web app at it with the `AI_BACKEND_URL` environment
variable.

When `AI_BACKEND_URL` is **not** set, or the service is unreachable, the web app
falls back to the built-in Lovable AI gateway and marks every result with
`source: "lovable-ai"`. If neither is available, results are
`source: "unavailable"` and the UI shows "AI service not connected".
No confidence value is ever fabricated.

## Endpoints

All endpoints accept and return JSON.

### `GET /health`
```json
{ "status": "ok", "models": ["yolov8n-civic", "xlm-roberta-civic"] }
```

### `POST /ai/analyze-image`
```json
// request
{ "complaint_id": "uuid", "image_url": "https://…" }
// response
{ "detected_objects": ["pothole", "standing water"], "issue_type": "pothole",
  "severity": 72, "confidence": 0.88, "explanation": "…" }
```
`issue_type` ∈ pothole, garbage, broken streetlight, water leakage, drainage
blockage, damaged road, illegal dumping, traffic issue, public infrastructure
damage, unclear.

### `POST /ai/classify`
```json
// request
{ "title": "…", "description": "…", "language": "hi", "imageUrl": "https://…" }
// response
{ "category": "ROAD", "subcategory": "Pothole", "department": "Public Works",
  "confidence": 0.91, "entities": ["MG Road", "ward 12"], "summary": "…",
  "priority": "HIGH", "priority_score": 78, "priority_reason": "…",
  "severity": 70, "detected_objects": [], "issue_type": "pothole" }
```
Categories: ROAD, GARBAGE, WATER, STREETLIGHT, DRAINAGE, TRAFFIC, PARKS, OTHER.
Must handle English, Hindi and other Indian languages.

### `POST /ai/priority`
```json
{ "priority": "CRITICAL", "score": 93, "reason": "…", "confidence": 0.86 }
```
Levels: LOW, MEDIUM, HIGH, CRITICAL.

### `POST /ai/duplicate`
```json
// request
{ "description": "…", "category": "ROAD", "latitude": 19.07, "longitude": 72.87,
  "candidates": [{ "id": "uuid", "complaint_number": "CM-2026-000123",
                   "description": "…", "latitude": 19.07, "longitude": 72.87,
                   "created_at": "2026-01-02T10:00:00Z" }] }
// response
{ "is_duplicate": true, "matched_complaint_id": "uuid",
  "similarity_score": 0.93, "detection_method": "text+geo+image" }
```
Signals: text similarity, location proximity, category match, image similarity,
time proximity.

### `POST /ai/summary`
```json
{ "summary": "…", "confidence": 0.8 }
```

## Suggested architecture

```
ai-backend/
  app/
    main.py            # FastAPI app + routers
    api/               # route handlers
    models/            # SQLAlchemy models (optional read-only mirror)
    schemas/           # Pydantic request/response models
    services/          # orchestration
    ml/                # shared training / inference utilities
    vision/            # YOLO / OpenCV image analysis
    nlp/               # multilingual classification (HF Transformers)
    duplicate_detection/
    priority/
    routing/
    utils/
  models/              # model weights (git-ignored)
  tests/
  requirements.txt
  Dockerfile
  .env.example
```

Suggested stack: FastAPI, Uvicorn, Pydantic, SQLAlchemy, PyTorch or TensorFlow,
OpenCV, Ultralytics YOLO, scikit-learn, XGBoost, Hugging Face Transformers,
Pandas, NumPy.

## Honesty rules

- Never return a `confidence` unless a real model produced it.
- Return HTTP 503 when a model is not loaded — the web app then degrades to the
  built-in AI or shows "AI service not connected".
- No trained civic model ships with this repository; the endpoints above are the
  integration contract, not a claim that weights exist.

## Environment

```
AI_BACKEND_URL=https://your-ai-backend.example.com
```
Set this as a server-side variable for the web app. Never expose model provider
API keys to the browser.
