#!/usr/bin/env python3
"""
scripts/scaffold.py — FastAPI + Dapr Service Scaffolder
Generates a complete production FastAPI+Dapr microservice directory.

Usage:
    python scaffold.py --name my-service --port 8001
    python scaffold.py --name concepts-svc --port 8002 --output-dir ./services/
"""

import argparse
import os
import sys
from pathlib import Path


def slugify(name: str) -> str:
    """Convert service name to Python identifier (snake_case)."""
    return name.replace("-", "_").replace(" ", "_").lower()


def write_file(path: Path, content: str) -> None:
    """Write content to path, creating parent directories as needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"  ✅ {path}")


def generate_main_py(service_name: str, port: int) -> str:
    """Generate main.py for the FastAPI + Dapr service."""
    module_name = slugify(service_name)
    return f'''# {service_name}/main.py — FastAPI + Dapr Service
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings
from .routes.health import router as health_router
from .routes.service import router as service_router

settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown logic."""
    app.state.http_client = httpx.AsyncClient(timeout=30.0)
    yield
    await app.state.http_client.aclose()


app = FastAPI(
    title="{service_name}",
    description="FastAPI microservice with Dapr sidecar",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(service_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port={port}, reload=True)
'''


def generate_config_py(service_name: str, port: int) -> str:
    """Generate config.py with Pydantic Settings."""
    return f'''# config.py — Settings for {service_name}
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "{service_name}"
    port: int = {port}
    debug: bool = False
    cors_origins: list[str] = ["*"]

    # Dapr
    dapr_http_port: int = 3500
    dapr_grpc_port: int = 50001

    # External services (via Dapr service invocation)
    groq_api_key: str = ""
    supabase_url: str = ""
    supabase_key: str = ""

    @property
    def dapr_base_url(self) -> str:
        return f"http://localhost:{{self.dapr_http_port}}/v1.0"
'''


def generate_models_py(service_name: str) -> str:
    """Generate models.py with Pydantic models."""
    return f'''# models.py — Request/Response models for {service_name}
from datetime import datetime

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    service: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ServiceRequest(BaseModel):
    """Generic service request — extend as needed."""
    payload: dict = Field(default_factory=dict, description="Request payload")
    user_id: str | None = Field(None, description="Optional user ID for tracking")


class ServiceResponse(BaseModel):
    """Generic service response — extend as needed."""
    success: bool
    data: dict | None = None
    error: str | None = None
    request_id: str | None = None
'''


def generate_health_route() -> str:
    """Generate health check route."""
    return '''# routes/health.py — Health check endpoint
from fastapi import APIRouter

from ..models import HealthResponse
from ..config import Settings

router = APIRouter(tags=["health"])
settings = Settings()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Liveness probe endpoint — returns service status."""
    return HealthResponse(service=settings.app_name)
'''


def generate_service_route(service_name: str) -> str:
    """Generate main service route."""
    return f'''# routes/service.py — Main service routes for {service_name}
from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..config import Settings
from ..models import ServiceRequest, ServiceResponse

router = APIRouter(prefix="/api", tags=["{service_name}"])


def get_settings() -> Settings:
    """Dependency: returns application settings."""
    return Settings()


@router.post("/invoke", response_model=ServiceResponse, status_code=status.HTTP_200_OK)
async def invoke(
    request: Request,
    body: ServiceRequest,
    settings: Settings = Depends(get_settings),
) -> ServiceResponse:
    """Main invocation endpoint — called by Dapr service invocation or direct HTTP."""
    try:
        # TODO: Replace with actual business logic
        http_client = request.app.state.http_client
        result: dict = {{"processed": True, "payload": body.payload}}
        return ServiceResponse(success=True, data=result)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


@router.post("/events/{{topic}}", status_code=status.HTTP_200_OK)
async def handle_dapr_event(topic: str, event: dict) -> dict:
    """Dapr pub/sub subscription endpoint — handles events from subscribed topics."""
    # Dapr sends events as CloudEvents format
    data = event.get("data", {{}})
    return {{"status": "SUCCESS"}}
'''


def generate_routes_init() -> str:
    """Generate routes/__init__.py."""
    return '''# routes/__init__.py
'''


def generate_main_init(service_name: str) -> str:
    """Generate package __init__.py."""
    return f'''# __init__.py — {service_name} package
__version__ = "1.0.0"
'''


def generate_requirements(service_name: str) -> str:
    """Generate requirements.txt."""
    return '''fastapi>=0.115.0
uvicorn[standard]>=0.32.0
pydantic>=2.8.0
pydantic-settings>=2.5.0
httpx>=0.27.0
python-dotenv>=1.0.0
'''


def generate_dockerfile(service_name: str, port: int) -> str:
    """Generate multi-stage Dockerfile."""
    return f'''# Dockerfile — {service_name}
FROM python:3.13-slim AS base
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1 \\
    PIP_NO_CACHE_DIR=1 \\
    PIP_DISABLE_PIP_VERSION_CHECK=1

FROM base AS deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM deps AS runner
COPY . .
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

EXPOSE {port}

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \\
  CMD python -c "import urllib.request; urllib.request.urlopen(\'http://localhost:{port}/health\')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "{port}"]
'''


def generate_k8s_deployment(service_name: str, port: int, image: str) -> str:
    """Generate Kubernetes Deployment manifest with Dapr annotations."""
    module_name = slugify(service_name)
    return f'''# k8s/deployment.yaml — {service_name} Kubernetes Deployment with Dapr
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {service_name}
  labels:
    app: {service_name}
    version: "1.0.0"
spec:
  replicas: 2
  selector:
    matchLabels:
      app: {service_name}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: {service_name}
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "{service_name}"
        dapr.io/app-port: "{port}"
        dapr.io/config: "tracing"
        dapr.io/log-level: "info"
        dapr.io/sidecar-cpu-request: "50m"
        dapr.io/sidecar-cpu-limit: "250m"
        dapr.io/sidecar-memory-request: "64Mi"
        dapr.io/sidecar-memory-limit: "256Mi"
    spec:
      containers:
        - name: {service_name}
          image: {image}:{service_name}-latest
          imagePullPolicy: Always
          ports:
            - containerPort: {port}
              name: http
          envFrom:
            - configMapRef:
                name: {service_name}-config
            - secretRef:
                name: {service_name}-secret
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /health
              port: {port}
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: {port}
            initialDelaySeconds: 15
            periodSeconds: 30
            timeoutSeconds: 10
      terminationGracePeriodSeconds: 30
'''


def generate_k8s_service(service_name: str, port: int) -> str:
    """Generate Kubernetes Service manifest."""
    return f'''# k8s/service.yaml — {service_name} Kubernetes Service
apiVersion: v1
kind: Service
metadata:
  name: {service_name}
  labels:
    app: {service_name}
spec:
  type: ClusterIP
  selector:
    app: {service_name}
  ports:
    - name: http
      port: 80
      targetPort: {port}
      protocol: TCP
'''


def generate_k8s_configmap(service_name: str, port: int) -> str:
    """Generate Kubernetes ConfigMap."""
    return f'''# k8s/configmap.yaml — {service_name} configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: {service_name}-config
  labels:
    app: {service_name}
data:
  APP_NAME: "{service_name}"
  PORT: "{port}"
  DEBUG: "false"
  CORS_ORIGINS: "*"
'''


def generate_env_example() -> str:
    """Generate .env.example file."""
    return '''# .env.example — copy to .env and fill in values
GROQ_API_KEY=your_groq_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key_here
DEBUG=false
CORS_ORIGINS=*
'''


def generate_procfile(port: int) -> str:
    """Generate Procfile for Koyeb/Heroku deployment."""
    return f'web: uvicorn main:app --host 0.0.0.0 --port $PORT\n'


def scaffold_service(
    service_name: str,
    port: int,
    output_dir: Path,
    docker_registry: str,
) -> None:
    """Generate all files for a FastAPI+Dapr microservice."""
    service_dir = output_dir / service_name
    module_name = slugify(service_name)

    print(f"\n🏗️  Scaffolding service: {service_name} → {service_dir}")

    files: dict[Path, str] = {
        service_dir / "__init__.py": generate_main_init(service_name),
        service_dir / "main.py": generate_main_py(service_name, port),
        service_dir / "config.py": generate_config_py(service_name, port),
        service_dir / "models.py": generate_models_py(service_name),
        service_dir / "routes" / "__init__.py": generate_routes_init(),
        service_dir / "routes" / "health.py": generate_health_route(),
        service_dir / "routes" / "service.py": generate_service_route(service_name),
        service_dir / "requirements.txt": generate_requirements(service_name),
        service_dir / "Dockerfile": generate_dockerfile(service_name, port),
        service_dir / "Procfile": generate_procfile(port),
        service_dir / ".env.example": generate_env_example(),
        service_dir / "k8s" / "deployment.yaml": generate_k8s_deployment(
            service_name, port, docker_registry
        ),
        service_dir / "k8s" / "service.yaml": generate_k8s_service(service_name, port),
        service_dir / "k8s" / "configmap.yaml": generate_k8s_configmap(service_name, port),
    }

    for file_path, content in files.items():
        write_file(file_path, content)

    print(f"\n✅ Service '{service_name}' scaffolded at: {service_dir.resolve()}")
    print(f"\n🚀 Next steps:")
    print(f"   cd {service_dir}")
    print(f"   cp .env.example .env && vim .env")
    print(f"   pip install -r requirements.txt")
    print(f"   uvicorn main:app --port {port} --reload")
    print(f"   # Or with Dapr:")
    print(f"   dapr run --app-id {service_name} --app-port {port} -- uvicorn main:app --port {port}")


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Scaffold a FastAPI + Dapr microservice",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--name", required=True, help="Service name (e.g. my-service)")
    parser.add_argument("--port", type=int, default=8000, help="HTTP port (default: 8000)")
    parser.add_argument(
        "--output-dir", type=Path, default=Path("."), help="Output directory (default: .)"
    )
    parser.add_argument(
        "--docker-registry",
        default="ghcr.io/panaversity",
        help="Docker registry prefix (default: ghcr.io/panaversity)",
    )
    return parser.parse_args()


def main() -> None:
    """Entry point."""
    args = parse_args()
    scaffold_service(
        service_name=args.name,
        port=args.port,
        output_dir=args.output_dir.resolve(),
        docker_registry=args.docker_registry,
    )


if __name__ == "__main__":
    main()
