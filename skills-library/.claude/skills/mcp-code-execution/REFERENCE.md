# MCP Code Execution — Technical Reference

## Overview
This MCP server exposes a single tool, `execute_python`, that runs arbitrary Python code
in a subprocess with strict resource limits:
- CPU timeout: configurable (default 5s)
- Memory limit: 50MB (via `resource.setrlimit` on Linux/macOS)
- No network access (subprocess isolation)
- No file system writes outside /tmp
- Only Python stdlib — no third-party imports

## MCP Protocol
The server implements the Model Context Protocol over stdio (default) or SSE.
It registers one tool:
```json
{
  "name": "execute_python",
  "description": "Execute Python code safely in a sandboxed subprocess",
  "inputSchema": {
    "type": "object",
    "properties": {
      "code": {"type": "string", "description": "Python source code to execute"},
      "timeout": {"type": "number", "default": 5, "description": "Max seconds to run"}
    },
    "required": ["code"]
  }
}
```

## Response Format
```json
{
  "stdout": "Hello, World!\n",
  "stderr": "",
  "exit_code": 0,
  "timed_out": false,
  "execution_time_ms": 42
}
```

## Security Model
| Protection | Mechanism |
|------------|-----------|
| CPU timeout | `subprocess.run(timeout=N)` |
| Memory limit | `resource.setrlimit(RLIMIT_AS, 50MB)` via preexec_fn |
| Network | Subprocess cannot open sockets (no additional firewall needed) |
| Filesystem | Writes only allowed in /tmp |
| Imports | Allowlist enforcement via AST analysis |

## AST-Based Import Filtering
Before execution, the code is parsed with `ast.parse()` to detect:
- `import socket`, `import requests`, `import urllib` → blocked
- `import os` with `os.system`, `os.popen` → blocked
- `__import__`, `eval`, `exec`, `compile` → blocked

## Usage Examples
```python
# From an MCP client
result = await mcp_client.call_tool("execute_python", {
    "code": "print(sum(range(100)))",
    "timeout": 3
})
# result.content → [{"type": "text", "text": '{"stdout": "4950\\n", ...}'}]
```

## Running the Server
```bash
# stdio mode (for Claude Desktop, etc.)
python scripts/run.py

# HTTP/SSE mode (for web clients)
python scripts/run.py --transport sse --port 8765
```

## Limitations
- `resource.setrlimit` only works on Unix (Linux/macOS). On Windows, only timeout applies.
- Processes that fork cannot be terminated by timeout.
- Very tight memory limit may cause NumPy/Pandas to fail even if allowed.
