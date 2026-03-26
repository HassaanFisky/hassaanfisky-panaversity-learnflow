"""
debug-service/main.py
LearnFlow Debug Service — Analyzes errors and provides hints (not full answers) via Groq.
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
    title="LearnFlow Debug Service",
    description="Analyzes Python errors and provides Socratic hints (not full answers) via Groq",
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


class DebugRequest(BaseModel):
    """Request to debug a Python error."""
    error_message: str = Field(..., min_length=1, max_length=2000, description="The error message or traceback")
    code: str = Field(default="", max_length=5000, description="Python code that caused the error")
    context: str = Field(default="", max_length=1000, description="What the learner was trying to do")


class DebugResponse(BaseModel):
    """Debug hint response — guides without giving away the answer."""
    hint: str = Field(..., description="Socratic hint pointing at the issue without giving the solution")
    likely_cause: str = Field(..., description="Root cause category of the error")
    error_type: str = Field(..., description="Python exception class, e.g. TypeError, NameError")
    docs_link: str = Field(..., description="Relevant Python docs or tutorial URL")
    breadcrumb: list[str] = Field(default_factory=list, description="Step-by-step debugging breadcrumbs")
    is_common_mistake: bool = Field(default=False, description="Whether this is a very common beginner mistake")


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok", "service": "debug-service"}


@app.post("/debug", response_model=DebugResponse, status_code=status.HTTP_200_OK)
async def debug_error(request: DebugRequest) -> DebugResponse:
    """
    Analyze a Python error and return Socratic hints (not the full solution).
    Helps learners develop debugging skills rather than depending on direct answers.
    """
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GROQ_API_KEY not configured",
        )

    system_prompt = """You are a Socratic Python tutor for LearnFlow. 
Your goal is to help learners FIND the bug themselves, not to fix it for them.

CRITICAL RULES:
- Do NOT provide the corrected code
- Do NOT say "the fix is..." or "change X to Y"
- DO ask guiding questions that lead the learner to the answer
- DO explain what the error means in simple terms
- DO point to the relevant part of the code/error causing the issue
- DO provide a Python docs link when relevant

Respond ONLY with a valid JSON object matching this exact structure:
{
  "hint": "<Socratic question or guiding observation — 2-3 sentences — NO direct fix>",
  "likely_cause": "<root cause category: e.g. 'off-by-one error', 'wrong variable scope', 'type mismatch'>",
  "error_type": "<Python exception class, e.g. TypeError, NameError, IndexError>",
  "docs_link": "<relevant Python docs URL, e.g. https://docs.python.org/3/library/exceptions.html#TypeError>",
  "breadcrumb": [
    "<step 1: what to look at first>",
    "<step 2: what to check next>",
    "<step 3: what to try>"
  ],
  "is_common_mistake": <true or false>
}

Do NOT include any text outside the JSON object."""

    user_message = f"Error message:\n{request.error_message}"
    if request.code.strip():
        user_message += f"\n\nCode:\n```python\n{request.code}\n```"
    if request.context.strip():
        user_message += f"\n\nLearner was trying to: {request.context}"

    completion = groq_client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.3,
        max_tokens=1024,
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

    return DebugResponse(
        hint=data.get("hint", "Look carefully at the line the error points to."),
        likely_cause=data.get("likely_cause", "Unknown"),
        error_type=data.get("error_type", "Exception"),
        docs_link=data.get("docs_link", "https://docs.python.org/3/library/exceptions.html"),
        breadcrumb=data.get("breadcrumb", []),
        is_common_mistake=bool(data.get("is_common_mistake", False)),
    )
