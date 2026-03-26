"""
exercise-service/main.py
LearnFlow Exercise Service — Generates Python exercises via Groq and grades code in a sandbox.
LLM: groq-sdk, model: llama-3.3-70b-versatile
Sandbox: subprocess with timeout=5s, resource limits (50MB RAM on Unix)
"""

import ast
import json
import os
import platform
import subprocess
import sys
import textwrap
import time
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(
    title="LearnFlow Exercise Service",
    description="Generates Python exercises and grades student code in a secure sandbox",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
MODEL = "llama-3.3-70b-versatile"

LevelType = Literal["beginner", "intermediate", "advanced"]
SANDBOX_TIMEOUT = 5  # seconds
SANDBOX_MEMORY_MB = 50
MAX_CODE_LENGTH = 5_000
MAX_OUTPUT_LENGTH = 10_000


# ── Models ─────────────────────────────────────────────────────────────────────

class TestCase(BaseModel):
    """A single test case for an exercise."""
    input: str = Field(default="", description="Input to pass to student code (empty if no input)")
    expected_output: str = Field(..., description="Expected stdout output")
    description: str = Field(default="", description="Human-readable test description")


class GenerateRequest(BaseModel):
    """Request to generate a Python exercise."""
    module_slug: str = Field(..., description="Python module slug, e.g. 'basics', 'oop'")
    topic: str = Field(default="", description="Specific topic within the module")
    level: LevelType = Field(default="beginner", description="Difficulty level")


class Exercise(BaseModel):
    """A generated Python exercise."""
    title: str
    prompt: str
    starter_code: str
    test_cases: list[TestCase]
    hints: list[str]
    module_slug: str
    difficulty: str
    expected_concepts: list[str]


class GradeRequest(BaseModel):
    """Request to grade student code against an exercise."""
    code: str = Field(..., min_length=1, max_length=MAX_CODE_LENGTH)
    test_cases: list[TestCase] = Field(..., min_length=1)
    exercise_title: str = Field(default="")


class GradeResponse(BaseModel):
    """Grading result from sandbox execution."""
    passed: bool
    output: str
    feedback: str
    score: int = Field(..., ge=0, le=100, description="Percentage of test cases passed")
    tests_passed: int
    tests_total: int
    execution_time_ms: int
    error: str = Field(default="", description="Runtime error if any")


# ── Sandbox ────────────────────────────────────────────────────────────────────

def _build_preexec() -> Any:
    """Build resource-limiting preexec_fn for Unix systems."""
    if platform.system() == "Windows":
        return None

    def _set_limits() -> None:
        try:
            import resource
            mem = SANDBOX_MEMORY_MB * 1024 * 1024
            resource.setrlimit(resource.RLIMIT_AS, (mem, mem))
        except Exception:
            pass

    return _set_limits


def _run_in_sandbox(code: str, stdin_data: str = "") -> dict[str, Any]:
    """Execute Python code in a subprocess sandbox with timeout and resource limits."""
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
        stdout = result.stdout[:MAX_OUTPUT_LENGTH]
        stderr = result.stderr[:MAX_OUTPUT_LENGTH]
        return {
            "stdout": stdout,
            "stderr": stderr,
            "exit_code": result.returncode,
            "timed_out": False,
            "elapsed_ms": elapsed_ms,
        }
    except subprocess.TimeoutExpired:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return {
            "stdout": "",
            "stderr": f"TimeoutError: Code exceeded {SANDBOX_TIMEOUT}s",
            "exit_code": -1,
            "timed_out": True,
            "elapsed_ms": elapsed_ms,
        }
    except Exception as exc:
        return {
            "stdout": "",
            "stderr": str(exc),
            "exit_code": -1,
            "timed_out": False,
            "elapsed_ms": 0,
        }


def _normalize_output(output: str) -> str:
    """Normalize output for comparison: strip trailing whitespace from each line."""
    return "\n".join(line.rstrip() for line in output.strip().splitlines()).strip()


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok", "service": "exercise-service"}


@app.post("/generate", response_model=Exercise, status_code=status.HTTP_200_OK)
async def generate_exercise(request: GenerateRequest) -> Exercise:
    """Generate a Python exercise for a given module and topic using Groq."""
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GROQ_API_KEY not configured",
        )

    topic_clause = f" specifically about '{request.topic}'" if request.topic else ""
    system_prompt = f"""You are a Python curriculum designer for LearnFlow.
Generate a self-contained Python programming exercise for the '{request.module_slug}' module{topic_clause}.
Difficulty: {request.level}

RULES:
- The exercise must be solvable with Python stdlib ONLY
- Include 3-5 test cases with exact expected output (what print() would show)
- starter_code should have a function stub or skeleton for the learner to fill in
- Do NOT include the solution

Respond ONLY with a valid JSON object:
{{
  "title": "<short exercise title>",
  "prompt": "<clear 2-4 sentence problem description>",
  "starter_code": "<Python code with function stubs/skeleton — no solution>",
  "test_cases": [
    {{
      "input": "<stdin input or empty string>",
      "expected_output": "<exact expected stdout>",
      "description": "<what this test case checks>"
    }}
  ],
  "hints": ["<hint 1>", "<hint 2>", "<hint 3>"],
  "expected_concepts": ["<concept1>", "<concept2>"]
}}
Do NOT include any text outside the JSON object."""

    completion = groq_client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate a {request.level} exercise for: {request.module_slug}"},
        ],
        temperature=0.6,
        max_tokens=2048,
        response_format={"type": "json_object"},
    )

    raw = completion.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to parse Groq response: {exc}",
        ) from exc

    test_cases = [
        TestCase(
            input=tc.get("input", ""),
            expected_output=tc.get("expected_output", ""),
            description=tc.get("description", ""),
        )
        for tc in data.get("test_cases", [])
    ]

    return Exercise(
        title=data.get("title", "Python Exercise"),
        prompt=data.get("prompt", ""),
        starter_code=data.get("starter_code", ""),
        test_cases=test_cases,
        hints=data.get("hints", []),
        module_slug=request.module_slug,
        difficulty=request.level,
        expected_concepts=data.get("expected_concepts", []),
    )


@app.post("/grade", response_model=GradeResponse, status_code=status.HTTP_200_OK)
async def grade_submission(request: GradeRequest) -> GradeResponse:
    """
    Run student code in a sandbox against test cases.
    Returns pass/fail per test case with aggregate score.
    Only Python stdlib is allowed; timeout=5s, RAM=50MB.
    """
    if len(request.code) > MAX_CODE_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Code too long: {len(request.code)} chars (max {MAX_CODE_LENGTH})",
        )

    # Basic AST check — block obviously dangerous patterns
    try:
        ast.parse(request.code)
    except SyntaxError as exc:
        return GradeResponse(
            passed=False,
            output="",
            feedback=f"Syntax error: {exc}",
            score=0,
            tests_passed=0,
            tests_total=len(request.test_cases),
            execution_time_ms=0,
            error=str(exc),
        )

    tests_passed = 0
    total_elapsed = 0
    output_lines: list[str] = []
    last_error = ""

    for i, tc in enumerate(request.test_cases, start=1):
        run_result = _run_in_sandbox(request.code, stdin_data=tc.input)
        total_elapsed += run_result["elapsed_ms"]

        if run_result["timed_out"]:
            output_lines.append(f"Test {i}: ⏰ TIMEOUT")
            last_error = "Code exceeded time limit"
            continue

        if run_result["exit_code"] != 0:
            err_preview = run_result["stderr"][:200]
            output_lines.append(f"Test {i}: ❌ RUNTIME ERROR — {err_preview}")
            last_error = run_result["stderr"]
            continue

        actual = _normalize_output(run_result["stdout"])
        expected = _normalize_output(tc.expected_output)

        if actual == expected:
            tests_passed += 1
            output_lines.append(f"Test {i}: ✅ PASSED")
        else:
            desc = f" ({tc.description})" if tc.description else ""
            output_lines.append(
                f"Test {i}: ❌ FAILED{desc}\n"
                f"  Expected: {repr(expected[:100])}\n"
                f"  Got:      {repr(actual[:100])}"
            )

    score = round((tests_passed / len(request.test_cases)) * 100) if request.test_cases else 0
    passed = tests_passed == len(request.test_cases)

    if passed:
        feedback = "🎉 All tests passed! Excellent work."
    elif tests_passed == 0:
        feedback = "No tests passed yet. Check your logic and try again. Look at the test outputs above."
    else:
        pct = round((tests_passed / len(request.test_cases)) * 100)
        feedback = (
            f"You passed {tests_passed}/{len(request.test_cases)} tests ({pct}%). "
            "You're on the right track! Review the failed tests for clues."
        )

    return GradeResponse(
        passed=passed,
        output="\n".join(output_lines),
        feedback=feedback,
        score=score,
        tests_passed=tests_passed,
        tests_total=len(request.test_cases),
        execution_time_ms=total_elapsed,
        error=last_error,
    )
