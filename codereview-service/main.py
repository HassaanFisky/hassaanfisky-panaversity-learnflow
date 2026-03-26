"""
codereview-service/main.py
LearnFlow Code Review Service — PEP8 + correctness review via Groq.
LLM: groq-sdk, model: llama-3.3-70b-versatile
"""

import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(
    title="LearnFlow Code Review Service",
    description="Reviews Python code for PEP8 compliance and correctness using Groq",
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


class ReviewIssue(BaseModel):
    """A single code issue found during review."""
    line: int | None = Field(None, description="Line number (if applicable)")
    severity: str = Field(..., description="error|warning|info|style")
    category: str = Field(..., description="pep8|correctness|performance|readability|security")
    message: str = Field(..., description="Human-readable description of the issue")
    rule: str = Field(default="", description="PEP8 rule or principle, e.g. E501, W291")


class ReviewRequest(BaseModel):
    """Request to review Python code."""
    code: str = Field(..., min_length=1, max_length=10000, description="Python code to review")
    context: str = Field(default="", max_length=1000, description="What the code is supposed to do")


class ReviewResponse(BaseModel):
    """Full code review response."""
    issues: list[ReviewIssue]
    suggestions: list[str]
    score: int = Field(..., ge=0, le=100, description="Overall code quality score 0-100")
    corrected_code: str = Field(..., description="Improved version of the submitted code")
    summary: str = Field(..., description="Brief overall assessment")


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok", "service": "codereview-service"}


@app.post("/review", response_model=ReviewResponse, status_code=status.HTTP_200_OK)
async def review_code(request: ReviewRequest) -> ReviewResponse:
    """
    Review Python code for PEP8 compliance, correctness, performance, and readability.
    Returns structured issues, suggestions, a quality score, and corrected code.
    """
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GROQ_API_KEY not configured",
        )

    system_prompt = """You are an expert Python code reviewer for a learning platform.
Review the submitted code for:
1. PEP 8 style compliance (naming, spacing, line length, imports)
2. Correctness (logic errors, off-by-one, edge cases not handled)
3. Performance (unnecessary loops, string concatenation, missing list comprehensions)
4. Readability (unclear variable names, missing docstrings, complex expressions)
5. Security (dangerous eval, hardcoded secrets, SQL injection if applicable)

Respond ONLY with a valid JSON object matching this exact structure:
{
  "issues": [
    {
      "line": <int or null>,
      "severity": "<error|warning|info|style>",
      "category": "<pep8|correctness|performance|readability|security>",
      "message": "<clear description>",
      "rule": "<e.g. E501, W391, or empty string>"
    }
  ],
  "suggestions": ["<actionable improvement 1>", "<actionable improvement 2>"],
  "score": <integer 0-100>,
  "corrected_code": "<complete improved Python code, no markdown fences>",
  "summary": "<2-3 sentence overall assessment>"
}

Scoring guide:
- 90-100: Excellent, very minor style issues only
- 70-89: Good, some style/readability improvements needed
- 50-69: Acceptable, some correctness or significant style issues
- 30-49: Poor, multiple bugs or major style violations
- 0-29: Critical issues, code likely does not work

Do NOT include any text outside the JSON object."""

    user_message = f"Review this Python code:\n\n```python\n{request.code}\n```"
    if request.context:
        user_message += f"\n\nContext: {request.context}"

    completion = groq_client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.2,
        max_tokens=4096,
        response_format={"type": "json_object"},
    )

    raw_response = completion.choices[0].message.content or "{}"

    try:
        data = json.loads(raw_response)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to parse Groq response: {exc}",
        ) from exc

    issues = [
        ReviewIssue(
            line=issue.get("line"),
            severity=issue.get("severity", "info"),
            category=issue.get("category", "readability"),
            message=issue.get("message", ""),
            rule=issue.get("rule", ""),
        )
        for issue in data.get("issues", [])
    ]

    return ReviewResponse(
        issues=issues,
        suggestions=data.get("suggestions", []),
        score=max(0, min(100, int(data.get("score", 50)))),
        corrected_code=data.get("corrected_code", request.code),
        summary=data.get("summary", ""),
    )
