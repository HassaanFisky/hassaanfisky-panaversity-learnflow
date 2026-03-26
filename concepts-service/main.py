"""
concepts-service/main.py
LearnFlow Concepts Service — Explains Python concepts at the learner's level via Groq.
LLM: groq-sdk, model: llama-3.3-70b-versatile
"""

import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(
    title="LearnFlow Concepts Service",
    description="Explains Python concepts at the appropriate learner level using Groq",
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

LEVEL_INSTRUCTIONS: dict[str, str] = {
    "beginner": (
        "Use simple, friendly language. Avoid jargon. "
        "Include a very basic, concrete real-world analogy. "
        "Add a minimal, 5–10 line runnable Python example with print statements showing output. "
        "End with one 'try it yourself' prompt."
    ),
    "intermediate": (
        "Assume basic Python knowledge. Explain the concept thoroughly. "
        "Include a practical, realistic code example (15–20 lines). "
        "Mention common pitfalls and best practices. "
        "Reference the official Python documentation where relevant."
    ),
    "advanced": (
        "Assume strong Python knowledge. Go deep: explain the implementation details, "
        "CPython internals if relevant, performance considerations, and edge cases. "
        "Provide a sophisticated code example (20–30 lines) demonstrating advanced usage. "
        "Compare with alternative approaches and their trade-offs."
    ),
}


class ExplainRequest(BaseModel):
    """Request to explain a Python concept."""
    concept: str = Field(..., min_length=1, max_length=500, description="Python concept to explain")
    level: LevelType = Field(default="beginner", description="Learner experience level")
    context: str = Field(default="", max_length=2000, description="Additional context from learner")


class ExplainResponse(BaseModel):
    """Explanation response from the concepts service."""
    concept: str
    level: str
    explanation: str
    code_example: str
    try_it: str
    follow_up_topics: list[str]


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok", "service": "concepts-service"}


@app.post("/explain", response_model=ExplainResponse, status_code=status.HTTP_200_OK)
async def explain_concept(request: ExplainRequest) -> ExplainResponse:
    """
    Explain a Python concept at the appropriate learner level using Groq.
    Returns structured explanation with code examples and follow-up topics.
    """
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GROQ_API_KEY not configured",
        )

    level_instruction = LEVEL_INSTRUCTIONS.get(request.level, LEVEL_INSTRUCTIONS["beginner"])

    system_prompt = f"""You are an expert Python tutor for a learning platform called LearnFlow.
Your task is to explain Python concepts clearly and accurately.

Learner level: {request.level}
Instructions for this level:
{level_instruction}

IMPORTANT: Respond ONLY with a valid JSON object matching this exact structure:
{{
  "concept": "<the concept name, normalized>",
  "level": "{request.level}",
  "explanation": "<clear explanation, 150-300 words>",
  "code_example": "<complete, runnable Python code as a string — no markdown fences>",
  "try_it": "<one specific exercise or challenge for the learner to try>",
  "follow_up_topics": ["<topic1>", "<topic2>", "<topic3>"]
}}

Do NOT include any text outside the JSON object. No markdown code blocks around the JSON."""

    user_message = f"Explain this Python concept: {request.concept}"
    if request.context:
        user_message += f"\n\nAdditional context from learner: {request.context}"

    completion = groq_client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.4,
        max_tokens=2048,
        response_format={"type": "json_object"},
    )

    raw_response = completion.choices[0].message.content or "{}"

    try:
        import json
        data = json.loads(raw_response)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to parse Groq response as JSON: {exc}",
        ) from exc

    return ExplainResponse(
        concept=data.get("concept", request.concept),
        level=data.get("level", request.level),
        explanation=data.get("explanation", ""),
        code_example=data.get("code_example", ""),
        try_it=data.get("try_it", ""),
        follow_up_topics=data.get("follow_up_topics", []),
    )
