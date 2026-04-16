---
name: mcp-code-execution
description: MCP server that safely executes Python code in a subprocess with timeout and resource limits
triggers:
  - "run python code safely"
  - "MCP code execution server"
  - "sandboxed python execution"
steps:
  1. Start MCP server: python scripts/run.py
  2. Connect MCP client to the server
  3. Call execute_python tool with code string
  4. Receive {stdout, stderr, exit_code, timed_out} response
checklist:
  - [ ] Python 3.11+ available
  - [ ] scripts/run.py started
  - [ ] MCP client connected
  - [ ] Code submitted via execute_python tool
  - [ ] Result validated before using output
output: MCP server exposing execute_python tool
---
