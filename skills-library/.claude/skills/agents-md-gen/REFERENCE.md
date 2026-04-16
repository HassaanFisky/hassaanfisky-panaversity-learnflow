# AGENTS.md Generator — Technical Reference

## Purpose
AGENTS.md is a machine-readable + human-readable document placed at the root of any project to
help AI coding assistants (Claude, Gemini, GPT-4, Codex) understand the project structure,
commands, and conventions without reading every file.

## AGENTS.md Structure
```
# Project: <name>
## Overview
- Purpose of the project
- Tech stack summary

## Architecture
- Directory layout with descriptions

## Commands
| Command | Description |
|---------|-------------|
| npm install | Install dependencies |
| npm run dev | Start dev server |

## Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| API_KEY  | Yes      | External service key |

## Conventions
- Naming conventions
- Branching strategy
- Code style rules
- Testing requirements

## Agent Instructions
- How to add new features
- How to run tests
- Forbidden patterns
```

## Script Usage
```bash
python scripts/generate.py --project-dir /path/to/project
python scripts/generate.py --project-dir /path/to/project --output /custom/path/AGENTS.md
python scripts/generate.py --project-dir /path/to/project --include-tree
```

## Detection Logic
The generator detects:
- `package.json` → Node.js/JS/TS project
- `pyproject.toml` / `requirements.txt` → Python project
- `go.mod` → Go project
- `Cargo.toml` → Rust project
- `Dockerfile` → Containerized service
- `.env.example` → Environment variables needed
- `k8s/` or `kubernetes/` → Kubernetes deployment
- `docker-compose.yml` → Docker Compose project

## Best Practices
- Keep AGENTS.md under 300 lines
- Update on every major structural change
- Include exact run commands, not paraphrases
- List ALL required env vars — missing ones break AI agents
