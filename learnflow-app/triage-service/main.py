"""
triage-service/main.py
LearnFlow Triage Service — Routes learner messages to specialist services via Groq tool_calling.
LLM: groq-sdk, model: llama-3.3-70b-versatile
"""

import json
import os
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field

load_dotenv()

# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="LearnFlow Triage Service",
    description="Routes messages to the appropriate specialist microservice using Groq tool_calling",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Groq client ────────────────────────────────────────────────────────────────
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
MODEL = "llama-3.3-70b-versatile"

# ── Service URLs (configurable via env) ───────────────────────────────────────
CONCEPTS_URL  = os.getenv("CONCEPTS_SERVICE_URL",  "http://localhost:8001")
CODEREVIEW_URL = os.getenv("CODEREVIEW_SERVICE_URL", "http://localhost:8002")
DEBUG_URL      = os.getenv("DEBUG_SERVICE_URL",      "http://localhost:8003")
EXERCISE_URL   = os.getenv("EXERCISE_SERVICE_URL",   "http://localhost:8004")
PROGRESS_URL   = os.getenv("PROGRESS_SERVICE_URL",   "http://localhost:8005")

# ── Pydantic models ────────────────────────────────────────────────────────────
class TriageRequest(BaseModel):
    """Incoming learner message for routing."""
    message: str = Field(..., min_length=1, max_length=4000, description="Learner's message or question")
    user_id: str = Field(..., description="Unique user identifier")
    context: str = Field(default="", description="Optional context (e.g. module name, current code)")
    level: str = Field(default="beginner", description="Learner level: beginner|intermediate|advanced")


class TriageResponse(BaseModel):
    """Response from triage, forwarded from specialist service."""
    routed_to: str = Field(..., description="Which specialist service handled the request")
    response: dict[str, Any] = Field(..., description="Raw response from specialist service")
    original_message: str = Field(..., description="Echo of original message for context")


# ── Groq Tool Definitions ──────────────────────────────────────────────────────
TRIAGE_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "route_to_concepts",
            "description": (
                "Route to the concepts explanation service. Use when the learner asks: "
                "'what is X', 'explain X', 'how does X work', 'I don't understand X', "
                "or any question about understanding a Python concept or topic."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "concept": {
                        "type": "string",
                        "description": "The specific Python concept to explain (e.g., 'list comprehension', 'decorators')",
                    },
                    "reason": {
                        "type": "string",
                        "description": "Brief reason for routing to concepts service",
                    },
                },
                "required": ["concept", "reason"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "route_to_codereview",
            "description": (
                "Route to the code review service. Use when the learner: "
                "shares Python code and asks for feedback, review, improvement suggestions, "
                "or asks 'is my code good', 'how can I improve this', 'is this pythonic'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "code_snippet": {
                        "type": "string",
                        "description": "The Python code to review (extracted from message or context)",
                    },
                    "reason": {
                        "type": "string",
                        "description": "Brief reason for routing to code review",
                    },
                },
                "required": ["code_snippet", "reason"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "route_to_debug",
            "description": (
                "Route to the debug service. Use when the learner: "
                "reports an error, shares a traceback, asks 'why is my code broken', "
                "'why am I getting this error', 'my code isn't working'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "error_message": {
                        "type": "string",
                        "description": "The error message or traceback (extracted from message or context)",
                    },
                    "code_snippet": {
                        "type": "string",
                        "description": "Code that caused the error",
                    },
                    "reason": {
                        "type": "string",
                        "description": "Brief reason for routing to debug service",
                    },
                },
                "required": ["error_message", "reason"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "route_to_exercise",
            "description": (
                "Route to the exercise service. Use when the learner asks: "
                "'give me an exercise', 'I want to practice', 'can I try a problem', "
                "'test my skills on X', 'challenge me'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": "The topic or module to generate an exercise for",
                    },
                    "reason": {
                        "type": "string",
                        "description": "Brief reason for routing to exercise service",
                    },
                },
                "required": ["topic", "reason"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "route_to_progress",
            "description": (
                "Route to the progress service. Use when the learner asks: "
                "'how am I doing', 'what is my progress', 'show my scores', "
                "'which modules have I completed', 'what should I study next'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {
                        "type": "string",
                        "description": "Brief reason for routing to progress service",
                    },
                },
                "required": ["reason"],
            },
        },
    },
]


# ── Service dispatcher ─────────────────────────────────────────────────────────

async def call_service(url: str, endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Call a downstream specialist service and return its response."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(f"{url}{endpoint}", json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Specialist service at {url} timed out",
            )
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=f"Specialist service error: {exc.response.text}",
            )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Cannot connect to specialist service at {url}",
            )


async def dispatch(
    tool_name: str,
    tool_args: dict[str, Any],
    request: TriageRequest,
) -> tuple[str, dict[str, Any]]:
    """Dispatch to the appropriate specialist service based on tool name."""
    if tool_name == "route_to_concepts":
        payload = {
            "concept": tool_args.get("concept", request.message),
            "level": request.level,
            "context": request.context,
        }
        result = await call_service(CONCEPTS_URL, "/explain", payload)
        return "concepts-service", result

    elif tool_name == "route_to_codereview":
        code = tool_args.get("code_snippet", "") or request.context
        payload = {
            "code": code,
            "context": request.message,
        }
        result = await call_service(CODEREVIEW_URL, "/review", payload)
        return "codereview-service", result

    elif tool_name == "route_to_debug":
        payload = {
            "error_message": tool_args.get("error_message", ""),
            "code": tool_args.get("code_snippet", "") or request.context,
            "context": request.message,
        }
        result = await call_service(DEBUG_URL, "/debug", payload)
        return "debug-service", result

    elif tool_name == "route_to_exercise":
        payload = {
            "module_slug": tool_args.get("topic", "basics"),
            "topic": tool_args.get("topic", ""),
            "level": request.level,
        }
        result = await call_service(EXERCISE_URL, "/generate", payload)
        return "exercise-service", result

    elif tool_name == "route_to_progress":
        result = await call_service(
            PROGRESS_URL, f"/progress/{request.user_id}", {}
        )
        return "progress-service", result

    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unknown tool routing: {tool_name}",
        )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok", "service": "triage-service"}


@app.post("/triage", response_model=TriageResponse, status_code=status.HTTP_200_OK)
async def triage_message(request: TriageRequest) -> TriageResponse:
    """
    Use Groq tool_calling to intelligently route the learner's message to the
    most appropriate specialist service (concepts, codereview, debug, exercise, progress).
    """
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GROQ_API_KEY not configured",
        )

    system_prompt = (
        "You are an AI tutor router for a Python learning platform called LearnFlow. "
        "Your ONLY job is to analyze the learner's message and call exactly ONE of the "
        "provided tools to route it to the correct specialist service. "
        "Do NOT answer the question yourself. ALWAYS call a tool."
    )

    user_content = f"Learner (level: {request.level}):\n{request.message}"
    if request.context:
        user_content += f"\n\nContext:\n{request.context}"

    completion = groq_client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        tools=TRIAGE_TOOLS,
        tool_choice="required",  # Force tool use
        temperature=0.1,
        max_tokens=1024,
    )

    message = completion.choices[0].message

    if not message.tool_calls or len(message.tool_calls) == 0:
        # Fallback: default to concepts service
        routed_to = "concepts-service"
        result = await call_service(
            CONCEPTS_URL,
            "/explain",
            {"concept": request.message, "level": request.level, "context": request.context},
        )
        return TriageResponse(
            routed_to=routed_to,
            response=result,
            original_message=request.message,
        )

    tool_call = message.tool_calls[0]
    tool_name = tool_call.function.name
    tool_args: dict[str, Any] = json.loads(tool_call.function.arguments or "{}")

    routed_to, result = await dispatch(tool_name, tool_args, request)

    return TriageResponse(
        routed_to=routed_to,
        response=result,
        original_message=request.message,
    )
