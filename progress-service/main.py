"""
progress-service/main.py
LearnFlow Progress Service — Tracks learner mastery scores in Supabase.
"""

import os
from datetime import datetime
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import Client, create_client

load_dotenv()

app = FastAPI(
    title="LearnFlow Progress Service",
    description="Tracks and updates learner mastery scores in Supabase",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_supabase() -> Client:
    """Create and return a Supabase client."""
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")
    if not url or not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SUPABASE_URL or SUPABASE_KEY not configured",
        )
    return create_client(url, key)


# ── Models ─────────────────────────────────────────────────────────────────────

class ModuleProgress(BaseModel):
    """Progress data for a single module."""
    module_slug: str
    module_name: str = ""
    mastery_score: float = Field(..., ge=0, le=100)
    attempts: int = Field(default=0, ge=0)
    last_activity: str = ""


class ProgressSummary(BaseModel):
    """Full progress summary for a learner."""
    user_id: str
    modules: list[ModuleProgress]
    overall_mastery: float = Field(..., ge=0, le=100)
    total_attempts: int
    modules_started: int
    modules_mastered: int = Field(..., description="Modules with mastery >= 80%")


class AnalyticsSummary(BaseModel):
    """Aggregate analytics for teacher dashboard."""
    total_users: int
    avg_mastery: float
    struggling_users: int
    module_distribution: list[dict[str, Any]]


class UpdateProgressRequest(BaseModel):
    """Request to update mastery score for a module."""
    module_slug: str = Field(..., description="Module slug to update progress for")
    exercise_score: float = Field(..., ge=0, le=100, description="Score from completed exercise (0-100)")
    exercise_id: str = Field(default="", description="Exercise ID for deduplication")


class UpdateProgressResponse(BaseModel):
    """Response after updating progress."""
    user_id: str
    module_slug: str
    new_mastery_score: float
    previous_mastery_score: float
    attempts: int
    message: str


# ── Progress calculation ───────────────────────────────────────────────────────

def calculate_weighted_mastery(current_mastery: float, new_score: float, attempts: int) -> float:
    """
    Calculate new mastery using exponential weighted moving average.
    Recent scores get more weight as attempts increase (max 70% existing weight).
    """
    if attempts == 0:
        return new_score
    # Weight existing mastery more heavily for established learners
    existing_weight = min(0.7, 0.5 + (attempts * 0.02))
    new_weight = 1.0 - existing_weight
    return round(current_mastery * existing_weight + new_score * new_weight, 2)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok", "service": "progress-service"}


@app.get("/progress/{user_id}", response_model=ProgressSummary, status_code=status.HTTP_200_OK)
async def get_progress(user_id: str) -> ProgressSummary:
    """
    Fetch mastery scores for all modules for a given user.
    Joins with modules table to include module names.
    """
    supabase = get_supabase()

    # Fetch all modules
    modules_result = supabase.table("modules").select("slug, name").order('"order"').execute()
    all_modules: list[dict[str, Any]] = modules_result.data or []

    # Fetch user progress
    progress_result = (
        supabase.table("progress")
        .select("module_slug, mastery_score, attempts, last_activity")
        .eq("user_id", user_id)
        .execute()
    )
    progress_data: list[dict[str, Any]] = progress_result.data or []

    # Build progress map
    progress_map: dict[str, dict[str, Any]] = {
        row["module_slug"]: row for row in progress_data
    }

    module_list: list[ModuleProgress] = []

    for mod in all_modules:
        slug = mod["slug"]
        prog = progress_map.get(slug)
        if prog:
            module_list.append(
                ModuleProgress(
                    module_slug=slug,
                    module_name=mod.get("name", slug),
                    mastery_score=float(prog.get("mastery_score", 0)),
                    attempts=int(prog.get("attempts", 0)),
                    last_activity=str(prog.get("last_activity", "")),
                )
            )
        else:
            module_list.append(
                ModuleProgress(
                    module_slug=slug,
                    module_name=mod.get("name", slug),
                    mastery_score=0.0,
                    attempts=0,
                    last_activity="",
                )
            )

    # Compute overall stats
    started = [m for m in module_list if m.attempts > 0]
    mastered = [m for m in module_list if m.mastery_score >= 80.0]
    total_attempts = sum(m.attempts for m in module_list)

    overall_mastery = 0.0
    if started:
        overall_mastery = round(sum(m.mastery_score for m in started) / len(started), 2)

    return ProgressSummary(
        user_id=user_id,
        modules=module_list,
        overall_mastery=overall_mastery,
        total_attempts=total_attempts,
        modules_started=len(started),
        modules_mastered=len(mastered),
    )


@app.get("/analytics/summary", response_model=AnalyticsSummary, status_code=status.HTTP_200_OK)
async def get_analytics_summary() -> AnalyticsSummary:
    """
    Aggregate cross-user data for teacher insights.
    Queries Supabase for total users, overall mastery levels, and struggle trends.
    """
    supabase = get_supabase()
    
    # Fetch progress and alerts data
    progress_res = supabase.table("progress").select("user_id, module_slug, mastery_score").execute()
    alerts_res = supabase.table("struggle_alerts").select("user_id").eq("resolved", False).execute()
    
    progress_data = progress_res.data or []
    alerts_data = alerts_res.data or []
    
    # Unique Users
    unique_users = len(set(r["user_id"] for r in progress_data))
    
    # Average Mastery
    scores = [float(r["mastery_score"]) for r in progress_data]
    avg_mastery = round(sum(scores) / len(scores), 1) if scores else 0.0
    
    # Struggling Users (count unique user_ids with active alerts)
    struggling_count = len(set(r["user_id"] for r in alerts_data))
    
    # Module Distribution
    module_counts: dict[str, int] = {}
    for r in progress_data:
        slug = r["module_slug"]
        module_counts[slug] = module_counts.get(slug, 0) + 1
        
    dist = [{"name": k.capitalize(), "value": v} for k, v in module_counts.items()]
    
    return AnalyticsSummary(
        total_users=unique_users,
        avg_mastery=avg_mastery,
        struggling_users=struggling_count,
        module_distribution=dist or [{"name": "Idle", "value": 1}]
    )


@app.post(
    "/progress/{user_id}",
    response_model=UpdateProgressResponse,
    status_code=status.HTTP_200_OK,
)
async def update_progress(user_id: str, request: UpdateProgressRequest) -> UpdateProgressResponse:
    """
    Update mastery score for a module using weighted average calculation.
    Creates a new record if none exists, otherwise updates existing.
    """
    supabase = get_supabase()

    # Fetch existing progress for this module
    existing_result = (
        supabase.table("progress")
        .select("mastery_score, attempts")
        .eq("user_id", user_id)
        .eq("module_slug", request.module_slug)
        .execute()
    )
    existing_rows: list[dict[str, Any]] = existing_result.data or []

    if existing_rows:
        row = existing_rows[0]
        previous_mastery = float(row.get("mastery_score", 0))
        attempts = int(row.get("attempts", 0))
        new_mastery = calculate_weighted_mastery(previous_mastery, request.exercise_score, attempts)
        new_attempts = attempts + 1

        supabase.table("progress").update(
            {
                "mastery_score": new_mastery,
                "attempts": new_attempts,
                "last_activity": datetime.utcnow().isoformat(),
            }
        ).eq("user_id", user_id).eq("module_slug", request.module_slug).execute()
    else:
        previous_mastery = 0.0
        new_mastery = round(float(request.exercise_score), 2)
        new_attempts = 1

        supabase.table("progress").insert(
            {
                "user_id": user_id,
                "module_slug": request.module_slug,
                "mastery_score": new_mastery,
                "attempts": new_attempts,
                "last_activity": datetime.utcnow().isoformat(),
            }
        ).execute()

    # Generate struggle alert if score is consistently low
    if new_mastery < 40.0 and new_attempts >= 3:
        try:
            supabase.table("struggle_alerts").insert(
                {
                    "user_id": user_id,
                    "module_slug": request.module_slug,
                    "alert_type": "low_score",
                    "details": {
                        "mastery_score": new_mastery,
                        "attempts": new_attempts,
                        "latest_exercise_score": request.exercise_score,
                    },
                }
            ).execute()
        except Exception:
            pass  # Non-critical: don't fail progress update if alert insert fails

    return UpdateProgressResponse(
        user_id=user_id,
        module_slug=request.module_slug,
        new_mastery_score=new_mastery,
        previous_mastery_score=previous_mastery,
        attempts=new_attempts,
        message=f"Progress updated for module '{request.module_slug}'",
    )
