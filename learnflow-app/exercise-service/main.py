# e:/panaversity/hackathon-3/learnflow-app/exercise-service/main.py
"""
LearnFlow Exercise Service — Generates Python exercises via Groq and grades code in a sandbox.
Persists results to Supabase and updates student progress via the Progress Service.
"""

import ast
import json
import os
import platform
import subprocess
import sys
import textwrap
import time
from typing import Any, Literal, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field
from supabase import Client, create_client

load_dotenv()

app = FastAPI(
    title="LearnFlow Exercise Service",
    description="Generates Python exercises and grades student code in a secure sandbox",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Clients & Config ──────────────────────────────────────────────────────────
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
MODEL = "llama-3.3-70b-versatile"
PROGRESS_SERVICE_URL = os.getenv("PROGRESS_SERVICE_URL", "http://localhost:8001")

def get_supabase() -> Client:
    """Create and return a Supabase client using service_role for full bypass."""
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")
    if not url or not key:
        return None
    return create_client(url, key)

LevelType = Literal["beginner", "intermediate", "advanced"]
SANDBOX_TIMEOUT = 5
SANDBOX_MEMORY_MB = 50
MAX_CODE_LENGTH = 5_000
MAX_OUTPUT_LENGTH = 10_000

# ── Models ─────────────────────────────────────────────────────────────────────

class TestCase(BaseModel):
    input: str = Field(default="", description="Input to pass to student code")
    expected_output: str = Field(..., description="Expected stdout output")
    description: str = Field(default="", description="Human-readable test description")

class GenerateRequest(BaseModel):
    module_slug: str = Field(..., description="Python module slug, e.g. 'basics', 'oop'")
    topic: str = Field(default="", description="Specific topic within the module")
    level: LevelType = Field(default="beginner", description="Difficulty level")

class Exercise(BaseModel):
    id: Optional[str] = None
    title: str
    prompt: str
    starter_code: str
    test_cases: list[TestCase]
    hints: list[str]
    module_slug: str
    difficulty: str
    expected_concepts: list[str]

class GradeRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=MAX_CODE_LENGTH)
    test_cases: list[TestCase] = Field(..., min_length=1)
    exercise_id: Optional[str] = Field(None, description="Reference to the persisted exercise")
    user_id: Optional[str] = Field(default="anonymous_user")
    exercise_title: str = Field(default="")

class GradeResponse(BaseModel):
    passed: bool
    output: str
    feedback: str
    score: int = Field(..., ge=0, le=100)
    tests_passed: int
    tests_total: int
    execution_time_ms: int
    error: str = Field(default="")
    submission_id: Optional[str] = None

# ── Sandbox logic ──────────────────────────────────────────────────────────────
def _build_preexec() -> Any:
    if platform.system() == "Windows": return None
    def _set_limits() -> None:
        try:
            import resource
            mem = SANDBOX_MEMORY_MB * 1024 * 1024
            resource.setrlimit(resource.RLIMIT_AS, (mem, mem))
        except Exception: pass
    return _set_limits

def _run_in_sandbox(code: str, stdin_data: str = "") -> dict[str, Any]:
    start = time.monotonic()
    try:
        result = subprocess.run(
            [sys.executable, "-c", code],
            input=stdin_data,
            capture_output=True,
            text=True,
            timeout=SANDBOX_TIMEOUT,
            preexec_fn=_build_preexec(),
        )
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return {
            "stdout": result.stdout[:MAX_OUTPUT_LENGTH],
            "stderr": result.stderr[:MAX_OUTPUT_LENGTH],
            "exit_code": result.returncode,
            "timed_out": False, "elapsed_ms": elapsed_ms,
        }
    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": f"TimeoutError: Code exceeded {SANDBOX_TIMEOUT}s", "exit_code": -1, "timed_out": True, "elapsed_ms": int((time.monotonic() - start) * 1000)}
    except Exception as exc:
        return {"stdout": "", "stderr": str(exc), "exit_code": -1, "timed_out": False, "elapsed_ms": 0}

def _normalize_output(output: str) -> str:
    return "\n".join(line.rstrip() for line in output.strip().splitlines()).strip()

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "exercise-service"}

@app.post("/generate", response_model=Exercise, status_code=status.HTTP_200_OK)
async def generate_exercise(request: GenerateRequest) -> Exercise:
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured")

    topic_clause = f" specifically about '{request.topic}'" if request.topic else ""
    system_prompt = f"""You are an elite Python curriculum designer (Aira) for LearnFlow.
Generate a self-contained Python programming exercise for the '{request.module_slug}' module{topic_clause}.
Difficulty: {request.level}

Respond ONLY with valid JSON:
{{
  "title": "<short exercise title>",
  "prompt": "<clear description following 'humanist' guidelines>",
  "starter_code": "<Python skeleton>",
  "test_cases": [{{ "input": "", "expected_output": "", "description": "" }}],
  "hints": ["hint 1", "hint 2"],
  "expected_concepts": ["concept1"]
}}"""

    completion = groq_client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": f"Generate a {request.level} exercise"}],
        temperature=0.6,
        response_format={"type": "json_object"},
    )

    data = json.loads(completion.choices[0].message.content or "{}")
    exercise_id = None
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("exercises").insert({
                "module_slug": request.module_slug,
                "topic": request.topic or data.get("title", ""),
                "prompt": data.get("prompt", ""),
                "test_cases": data.get("test_cases", []),
                "difficulty": request.level
            }).execute()
            if res.data: exercise_id = res.data[0]["id"]
        except Exception as e: print(f"Failed to persist exercise: {e}")

    return Exercise(
        id=exercise_id,
        title=data.get("title", "Python Exercise"),
        prompt=data.get("prompt", ""),
        starter_code=data.get("starter_code", ""),
        test_cases=[TestCase(**tc) for tc in data.get("test_cases", [])],
        hints=data.get("hints", []),
        module_slug=request.module_slug,
        difficulty=request.level,
        expected_concepts=data.get("expected_concepts", []),
    )

@app.post("/grade", response_model=GradeResponse, status_code=status.HTTP_200_OK)
async def grade_submission(request: GradeRequest) -> GradeResponse:
    if len(request.code) > MAX_CODE_LENGTH: raise HTTPException(status_code=422, detail="Code too long")
    try: ast.parse(request.code)
    except SyntaxError as exc:
        return GradeResponse(passed=False, output="", feedback=f"Syntax error: {exc}", score=0, tests_passed=0, tests_total=len(request.test_cases), execution_time_ms=0, error=str(exc))

    tests_passed = 0
    total_elapsed = 0
    output_lines = []
    last_error = ""

    for i, tc in enumerate(request.test_cases, start=1):
        run_result = _run_in_sandbox(request.code, stdin_data=tc.input)
        total_elapsed += run_result["elapsed_ms"]
        if run_result["timed_out"]: output_lines.append(f"Test {i}: ⏰ TIMEOUT"); last_error = "Timeout"; continue
        if run_result["exit_code"] != 0: output_lines.append(f"Test {i}: ❌ ERROR"); last_error = run_result["stderr"]; continue
        actual, expected = _normalize_output(run_result["stdout"]), _normalize_output(tc.expected_output)
        if actual == expected: tests_passed += 1; output_lines.append(f"Test {i}: ✅ PASSED")
        else: output_lines.append(f"Test {i}: ❌ FAILED")

    score = round((tests_passed / len(request.test_cases)) * 100) if request.test_cases else 0
    passed = (tests_passed == len(request.test_cases))
    feedback = "🎉 Perfect execution!" if passed else "Keep refining your approach."
    
    submission_id = None
    supabase = get_supabase()
    if supabase and request.exercise_id:
        try:
            # 1. Look up module_slug for this exercise
            ex_res = supabase.table("exercises").select("module_slug").eq("id", request.exercise_id).single().execute()
            module_slug = ex_res.data["module_slug"] if ex_res.data else "unknown"

            # 2. Persist submission
            sub_res = supabase.table("submissions").insert({
                "user_id": request.user_id,
                "exercise_id": request.exercise_id,
                "code": request.code,
                "passed": passed,
                "score": score,
                "output": "\n".join(output_lines)
            }).execute()
            if sub_res.data: submission_id = sub_res.data[0]["id"]

            # 3. Update Progress via Progress Service
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{PROGRESS_SERVICE_URL}/progress/{request.user_id}",
                    json={
                        "module_slug": module_slug,
                        "exercise_score": score,
                        "exercise_id": request.exercise_id
                    }
                )
        except Exception as e:
            print(f"Failed to synchronize state: {e}")

    return GradeResponse(
        passed=passed, output="\n".join(output_lines), feedback=feedback,
        score=score, tests_passed=tests_passed, tests_total=len(request.test_cases),
        execution_time_ms=total_elapsed, error=last_error, submission_id=submission_id
    )
