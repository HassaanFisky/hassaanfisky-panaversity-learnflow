# FastAPI + Dapr Agent — Technical Reference

## Overview
Dapr (Distributed Application Runtime) provides service invocation, pub/sub, state store,
secret store, and observability to microservices without requiring SDK changes.
The scaffold generates a production-ready FastAPI service with Dapr sidecar annotations.

## Generated File Structure
```
<service-name>/
├── main.py                    # FastAPI app entry point
├── routes/
│   ├── __init__.py
│   ├── health.py              # GET /health
│   └── service.py             # Domain routes
├── models.py                  # Pydantic request/response models
├── config.py                  # Settings from env vars
├── requirements.txt
├── Dockerfile
├── .env.example
└── k8s/
    ├── deployment.yaml        # With Dapr sidecar annotations
    ├── service.yaml
    └── configmap.yaml
```

## Dapr Sidecar Annotations
```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "<service-name>"
  dapr.io/app-port: "8000"
  dapr.io/config: "tracing"
  dapr.io/log-level: "info"
  dapr.io/sidecar-cpu-request: "50m"
  dapr.io/sidecar-memory-request: "64Mi"
```

## Dapr Service Invocation
Call another Dapr-enabled service:
```python
import httpx

async def call_service(service_id: str, method: str, data: dict) -> dict:
    url = f"http://localhost:3500/v1.0/invoke/{service_id}/method/{method}"
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=data)
        response.raise_for_status()
        return response.json()
```

## Dapr Pub/Sub
```python
# Publish an event
async def publish_event(pubsub: str, topic: str, data: dict) -> None:
    url = f"http://localhost:3500/v1.0/publish/{pubsub}/{topic}"
    async with httpx.AsyncClient() as client:
        await client.post(url, json=data)

# Subscribe (FastAPI endpoint called by Dapr)
@app.post("/events/learnflow-events")
async def handle_event(event: dict) -> dict:
    # Process event.data
    return {"status": "SUCCESS"}
```

## Dapr State Store
```python
DAPR_STATE_URL = "http://localhost:3500/v1.0/state/statestore"

async def save_state(key: str, value: dict) -> None:
    async with httpx.AsyncClient() as client:
        await client.post(DAPR_STATE_URL, json=[{"key": key, "value": value}])

async def get_state(key: str) -> dict | None:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{DAPR_STATE_URL}/{key}")
        return r.json() if r.status_code == 200 else None
```

## Local Development with Dapr CLI
```bash
# Install Dapr CLI
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
dapr init   # Initializes local Docker containers

# Run service with Dapr sidecar
dapr run \
  --app-id my-service \
  --app-port 8000 \
  --dapr-http-port 3500 \
  -- uvicorn main:app --port 8000 --reload
```
