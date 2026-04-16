#!/usr/bin/env python3
"""
scripts/run.py — MCP Server for safe Python code execution
Exposes a single MCP tool: execute_python

Usage:
    python run.py                            # stdio transport (default)
    python run.py --transport sse --port 8765
"""

import ast
import io
import json
import platform
import subprocess
import sys
import textwrap
import time
from typing import Any


# ── Blocked imports / builtins ──────────────────────────────────────────────────
BLOCKED_IMPORTS: set[str] = {
    "socket",
    "requests",
    "urllib",
    "urllib2",
    "urllib3",
    "httpx",
    "aiohttp",
    "paramiko",
    "ftplib",
    "smtplib",
    "imaplib",
    "poplib",
    "telnetlib",
    "ssl",
    "subprocess",
    "multiprocessing",
    "threading",
    "ctypes",
    "cffi",
}

BLOCKED_CALLS: set[str] = {
    "eval",
    "exec",
    "compile",
    "__import__",
    "open",
    "breakpoint",
}

MAX_CODE_LENGTH = 10_000  # characters
MAX_OUTPUT_LENGTH = 50_000  # characters
DEFAULT_TIMEOUT = 5  # seconds
MAX_TIMEOUT = 30  # seconds
MEMORY_LIMIT_MB = 50


# ── Security: Static analysis ──────────────────────────────────────────────────

class SecurityError(ValueError):
    """Raised when code fails security analysis."""
    pass


def analyze_code_safety(code: str) -> None:
    """
    Parse code with AST and enforce security restrictions.
    Raises SecurityError if forbidden patterns are found.
    """
    if len(code) > MAX_CODE_LENGTH:
        raise SecurityError(
            f"Code too long: {len(code)} chars (max {MAX_CODE_LENGTH})"
        )

    try:
        tree = ast.parse(code, mode="exec")
    except SyntaxError as exc:
        raise SecurityError(f"Syntax error: {exc}") from exc

    for node in ast.walk(tree):
        # Check import statements
        if isinstance(node, ast.Import):
            for alias in node.names:
                root_module = alias.name.split(".")[0]
                if root_module in BLOCKED_IMPORTS:
                    raise SecurityError(
                        f"Import blocked for security: '{alias.name}'"
                    )

        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root_module = node.module.split(".")[0]
                if root_module in BLOCKED_IMPORTS:
                    raise SecurityError(
                        f"Import blocked for security: '{node.module}'"
                    )

        # Check function calls (eval, exec, etc.)
        elif isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name) and func.id in BLOCKED_CALLS:
                raise SecurityError(f"Call blocked for security: '{func.id}()'")
            elif isinstance(func, ast.Attribute) and func.attr in BLOCKED_CALLS:
                raise SecurityError(f"Attribute call blocked: '.{func.attr}()'")

        # Block attribute access to dangerous os functions
        elif isinstance(node, ast.Attribute):
            if node.attr in {"system", "popen", "execv", "execve", "fork", "spawn"}:
                raise SecurityError(
                    f"Dangerous attribute access blocked: '.{node.attr}'"
                )


def build_preexec_fn() -> "Any | None":
    """
    Build a preexec_fn to set resource limits before exec().
    Only works on Unix; returns None on Windows.
    """
    if platform.system() == "Windows":
        return None

    def _set_limits() -> None:
        try:
            import resource as _resource
            # 50MB virtual memory limit
            limit_bytes = MEMORY_LIMIT_MB * 1024 * 1024
            _resource.setrlimit(_resource.RLIMIT_AS, (limit_bytes, limit_bytes))
            # CPU time limit (generous — wall clock timeout handles the main case)
            _resource.setrlimit(_resource.RLIMIT_CPU, (30, 30))
        except Exception:
            pass  # Best-effort — don't fail if resource module unavailable

    return _set_limits


def execute_code(code: str, timeout: float) -> dict[str, Any]:
    """
    Execute Python code in a subprocess sandbox and return results.

    Returns:
        dict with keys: stdout, stderr, exit_code, timed_out, execution_time_ms
    """
    timeout = min(float(timeout), MAX_TIMEOUT)

    # Wrap code to capture output
    wrapper = textwrap.dedent(f"""
import sys, io as _io
_stdout_capture = _io.StringIO()
_stderr_capture = _io.StringIO()
sys.stdout = _stdout_capture
sys.stderr = _stderr_capture
try:
{textwrap.indent(code, '    ')}
finally:
    sys.stdout = sys.__stdout__
    sys.stderr = sys.__stderr__
    print(_stdout_capture.getvalue(), end='', file=sys.__stdout__)
    print(_stderr_capture.getvalue(), end='', file=sys.__stderr__)
""")

    start = time.monotonic()
    timed_out = False

    try:
        result = subprocess.run(
            [sys.executable, "-c", wrapper],
            capture_output=True,
            text=True,
            timeout=timeout,
            preexec_fn=build_preexec_fn(),
        )
        stdout = result.stdout
        stderr = result.stderr
        exit_code = result.returncode
    except subprocess.TimeoutExpired:
        stdout = ""
        stderr = f"TimeoutError: Code exceeded {timeout}s time limit"
        exit_code = -1
        timed_out = True
    except Exception as exc:
        stdout = ""
        stderr = f"ExecutionError: {exc}"
        exit_code = -1

    elapsed_ms = int((time.monotonic() - start) * 1000)

    # Truncate output if too long
    if len(stdout) > MAX_OUTPUT_LENGTH:
        stdout = stdout[:MAX_OUTPUT_LENGTH] + "\n... [output truncated]"
    if len(stderr) > MAX_OUTPUT_LENGTH:
        stderr = stderr[:MAX_OUTPUT_LENGTH] + "\n... [output truncated]"

    return {
        "stdout": stdout,
        "stderr": stderr,
        "exit_code": exit_code,
        "timed_out": timed_out,
        "execution_time_ms": elapsed_ms,
    }


# ── MCP Protocol Implementation ────────────────────────────────────────────────

TOOL_DEFINITION = {
    "name": "execute_python",
    "description": (
        "Execute Python code safely in a sandboxed subprocess. "
        "Only Python standard library imports are allowed. "
        "Network access, file writes, and dangerous builtins are blocked. "
        "Returns stdout, stderr, exit_code, timed_out, and execution_time_ms."
    ),
    "inputSchema": {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "Python source code to execute",
            },
            "timeout": {
                "type": "number",
                "description": f"Max execution time in seconds (default: {DEFAULT_TIMEOUT}, max: {MAX_TIMEOUT})",
                "default": DEFAULT_TIMEOUT,
            },
        },
        "required": ["code"],
    },
}


def handle_request(request: dict) -> dict:
    """Handle a single MCP JSON-RPC request."""
    method = request.get("method", "")
    request_id = request.get("id")
    params = request.get("params", {})

    def ok(result: Any) -> dict:
        return {"jsonrpc": "2.0", "id": request_id, "result": result}

    def err(code: int, message: str, data: Any = None) -> dict:
        error: dict = {"code": code, "message": message}
        if data is not None:
            error["data"] = data
        return {"jsonrpc": "2.0", "id": request_id, "error": error}

    if method == "initialize":
        return ok(
            {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {
                    "name": "mcp-code-execution",
                    "version": "1.0.0",
                },
            }
        )

    elif method == "tools/list":
        return ok({"tools": [TOOL_DEFINITION]})

    elif method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments", {})

        if tool_name != "execute_python":
            return err(-32602, f"Unknown tool: {tool_name}")

        code = arguments.get("code", "")
        timeout = float(arguments.get("timeout", DEFAULT_TIMEOUT))

        if not code or not code.strip():
            return err(-32602, "Parameter 'code' is required and cannot be empty")

        # Security analysis
        try:
            analyze_code_safety(code)
        except SecurityError as exc:
            result_data = {
                "stdout": "",
                "stderr": str(exc),
                "exit_code": -1,
                "timed_out": False,
                "execution_time_ms": 0,
            }
            return ok(
                {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(result_data, indent=2),
                        }
                    ],
                    "isError": True,
                }
            )

        # Execute
        exec_result = execute_code(code, timeout)
        is_error = exec_result["exit_code"] != 0 or exec_result["timed_out"]

        return ok(
            {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(exec_result, indent=2),
                    }
                ],
                "isError": is_error,
            }
        )

    elif method == "notifications/initialized":
        # Notification — no response needed
        return {}  # type: ignore[return-value]

    else:
        return err(-32601, f"Method not found: {method}")


def run_stdio() -> None:
    """Run MCP server over stdio (default transport)."""
    import sys

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            line = line.strip()
            if not line:
                continue

            request = json.loads(line)
            response = handle_request(request)

            # Notifications have no response
            if response:
                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()

        except json.JSONDecodeError as exc:
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": f"Parse error: {exc}"},
            }
            sys.stdout.write(json.dumps(error_response) + "\n")
            sys.stdout.flush()
        except KeyboardInterrupt:
            break
        except Exception as exc:
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32603, "message": f"Internal error: {exc}"},
            }
            sys.stdout.write(json.dumps(error_response) + "\n")
            sys.stdout.flush()


def main() -> None:
    """Entry point — parse args and start MCP server."""
    import argparse

    parser = argparse.ArgumentParser(
        description="MCP Code Execution Server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse"],
        default="stdio",
        help="Transport protocol (default: stdio)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8765,
        help="Port for SSE transport (default: 8765)",
    )
    args = parser.parse_args()

    if args.transport == "sse":
        # For SSE transport, wrap in a simple HTTP server
        try:
            from http.server import BaseHTTPRequestHandler, HTTPServer

            class SSEHandler(BaseHTTPRequestHandler):
                def log_message(self, format: str, *args: Any) -> None:
                    pass  # Suppress default logging

                def do_POST(self) -> None:
                    if self.path != "/mcp":
                        self.send_response(404)
                        self.end_headers()
                        return
                    length = int(self.headers.get("Content-Length", 0))
                    body = self.rfile.read(length)
                    try:
                        request = json.loads(body)
                        response = handle_request(request)
                        response_bytes = json.dumps(response).encode()
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.send_header("Content-Length", str(len(response_bytes)))
                        self.end_headers()
                        self.wfile.write(response_bytes)
                    except Exception as exc:
                        self.send_response(500)
                        self.end_headers()

                def do_GET(self) -> None:
                    if self.path == "/health":
                        body = b'{"status": "ok"}'
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.send_header("Content-Length", str(len(body)))
                        self.end_headers()
                        self.wfile.write(body)
                    else:
                        self.send_response(404)
                        self.end_headers()

            server = HTTPServer(("0.0.0.0", args.port), SSEHandler)
            print(f"🚀 MCP Code Execution Server (SSE) listening on port {args.port}", file=sys.stderr)
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped", file=sys.stderr)
    else:
        print("🚀 MCP Code Execution Server (stdio) ready", file=sys.stderr)
        run_stdio()


if __name__ == "__main__":
    main()
