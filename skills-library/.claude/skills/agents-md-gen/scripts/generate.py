#!/usr/bin/env python3
"""
scripts/generate.py — AGENTS.md Generator
Scans a project directory and produces a comprehensive AGENTS.md file.
Usage:
    python generate.py --project-dir /path/to/project
    python generate.py --project-dir /path/to/project --output /custom/AGENTS.md
    python generate.py --project-dir /path/to/project --include-tree
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional


def detect_tech_stack(project_dir: Path) -> dict[str, bool]:
    """Detect technology stack from project files."""
    return {
        "nodejs": (project_dir / "package.json").exists(),
        "python": (
            (project_dir / "pyproject.toml").exists()
            or (project_dir / "requirements.txt").exists()
            or (project_dir / "setup.py").exists()
        ),
        "go": (project_dir / "go.mod").exists(),
        "rust": (project_dir / "Cargo.toml").exists(),
        "docker": (project_dir / "Dockerfile").exists(),
        "docker_compose": (project_dir / "docker-compose.yml").exists()
        or (project_dir / "docker-compose.yaml").exists(),
        "kubernetes": (project_dir / "k8s").is_dir()
        or (project_dir / "kubernetes").is_dir(),
        "nextjs": (project_dir / "next.config.js").exists()
        or (project_dir / "next.config.ts").exists()
        or (project_dir / "next.config.mjs").exists(),
        "fastapi": _file_contains(project_dir / "main.py", "FastAPI")
        or _file_contains(project_dir / "app" / "main.py", "FastAPI"),
        "env_example": (project_dir / ".env.example").exists(),
    }


def _file_contains(filepath: Path, text: str) -> bool:
    """Check if a file contains a specific text string."""
    try:
        if filepath.exists():
            return text in filepath.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        pass
    return False


def read_package_json(project_dir: Path) -> dict:
    """Read and parse package.json if it exists."""
    pkg_path = project_dir / "package.json"
    if not pkg_path.exists():
        return {}
    try:
        with open(pkg_path, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def read_env_example(project_dir: Path) -> list[dict[str, str]]:
    """Parse .env.example for environment variable names and comments."""
    env_path = project_dir / ".env.example"
    if not env_path.exists():
        return []

    variables: list[dict[str, str]] = []
    try:
        lines = env_path.read_text(encoding="utf-8").splitlines()
        pending_comment = ""
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("#"):
                pending_comment = stripped.lstrip("# ").strip()
                continue
            if "=" in stripped and not stripped.startswith("#"):
                key, _, default = stripped.partition("=")
                key = key.strip()
                default = default.strip()
                required = "YOUR_" in default or default == "" or default == '""'
                variables.append(
                    {
                        "name": key,
                        "required": "Yes" if required else "No",
                        "description": pending_comment or f"See .env.example",
                        "default": default if default and not required else "",
                    }
                )
                pending_comment = ""
    except OSError:
        pass
    return variables


def extract_scripts(project_dir: Path) -> dict[str, str]:
    """Extract npm/yarn scripts from package.json."""
    pkg = read_package_json(project_dir)
    return pkg.get("scripts", {})


def extract_python_commands(project_dir: Path) -> list[dict[str, str]]:
    """Extract common Python project commands."""
    commands: list[dict[str, str]] = []

    if (project_dir / "pyproject.toml").exists():
        content = (project_dir / "pyproject.toml").read_text(
            encoding="utf-8", errors="ignore"
        )
        if "uv" in content or "[tool.uv]" in content:
            commands += [
                {"command": "uv sync", "description": "Install all dependencies"},
                {"command": "uv run python main.py", "description": "Run main script"},
            ]
        else:
            commands += [
                {
                    "command": "pip install -e .",
                    "description": "Install package in editable mode",
                },
            ]

    if (project_dir / "requirements.txt").exists():
        commands.append(
            {
                "command": "pip install -r requirements.txt",
                "description": "Install Python dependencies",
            }
        )

    procfile = project_dir / "Procfile"
    if procfile.exists():
        try:
            proc_content = procfile.read_text(encoding="utf-8").strip()
            for line in proc_content.splitlines():
                if ":" in line:
                    proc_type, cmd = line.split(":", 1)
                    commands.append(
                        {
                            "command": cmd.strip(),
                            "description": f"Start {proc_type.strip()} process",
                        }
                    )
        except OSError:
            pass

    return commands


def get_directory_tree(project_dir: Path, max_depth: int = 3) -> str:
    """Generate a tree-style listing of the project directory."""
    lines: list[str] = []
    ignore_dirs = {
        ".git",
        "node_modules",
        "__pycache__",
        ".venv",
        "venv",
        ".next",
        "dist",
        "build",
        ".pytest_cache",
        ".mypy_cache",
    }

    def _walk(current: Path, prefix: str, depth: int) -> None:
        if depth > max_depth:
            return
        try:
            entries = sorted(
                current.iterdir(),
                key=lambda e: (e.is_file(), e.name.lower()),
            )
        except PermissionError:
            return

        entries = [e for e in entries if e.name not in ignore_dirs]
        for i, entry in enumerate(entries):
            is_last = i == len(entries) - 1
            connector = "└── " if is_last else "├── "
            lines.append(f"{prefix}{connector}{entry.name}{'/' if entry.is_dir() else ''}")
            if entry.is_dir():
                extension = "    " if is_last else "│   "
                _walk(entry, prefix + extension, depth + 1)

    lines.append(f"{project_dir.name}/")
    _walk(project_dir, "", 1)
    return "\n".join(lines)


def detect_conventions(project_dir: Path) -> list[str]:
    """Detect coding conventions from config files."""
    conventions: list[str] = []

    if (project_dir / ".eslintrc.js").exists() or (
        project_dir / ".eslintrc.json"
    ).exists() or (project_dir / "eslint.config.js").exists():
        conventions.append("ESLint enforced — run `npx eslint .` before committing")

    if (project_dir / ".prettierrc").exists() or (
        project_dir / "prettier.config.js"
    ).exists():
        conventions.append(
            "Prettier formatting enforced — run `npx prettier --write .` before committing"
        )

    if (project_dir / "pyproject.toml").exists():
        content = (project_dir / "pyproject.toml").read_text(
            encoding="utf-8", errors="ignore"
        )
        if "ruff" in content:
            conventions.append(
                "Ruff linting enforced — run `ruff check .` and `ruff format .` before committing"
            )
        if "mypy" in content:
            conventions.append(
                "Mypy type checking — run `mypy .` before committing"
            )
        if "pytest" in content:
            conventions.append("Tests: pytest — run `pytest` before committing")

    if (project_dir / "tsconfig.json").exists():
        conventions.append(
            "TypeScript strict mode — zero `any` types allowed"
        )

    return conventions


def detect_project_name(project_dir: Path) -> str:
    """Detect project name from package.json, pyproject.toml, or directory name."""
    pkg = read_package_json(project_dir)
    if pkg.get("name"):
        return str(pkg["name"])

    try:
        if (project_dir / "pyproject.toml").exists():
            content = (project_dir / "pyproject.toml").read_text(encoding="utf-8", errors="ignore")
            for line in content.splitlines():
                if line.strip().startswith("name") and "=" in line:
                    return line.split("=", 1)[1].strip().strip('"\'')
    except OSError:
        pass

    return project_dir.name


def detect_description(project_dir: Path) -> str:
    """Detect project description from package.json or README."""
    pkg = read_package_json(project_dir)
    if pkg.get("description"):
        return str(pkg["description"])

    for readme_name in ("README.md", "readme.md", "README.txt"):
        readme = project_dir / readme_name
        if readme.exists():
            try:
                lines = readme.read_text(encoding="utf-8", errors="ignore").splitlines()
                # Skip the first heading line, take first paragraph
                for line in lines[1:]:
                    stripped = line.strip()
                    if stripped and not stripped.startswith("#"):
                        return stripped[:200]
            except OSError:
                pass

    return "No description found."


def build_tech_stack_summary(stack: dict[str, bool]) -> list[str]:
    """Build human-readable tech stack list."""
    summary: list[str] = []
    if stack["nextjs"]:
        summary.append("Next.js (React framework)")
    elif stack["nodejs"]:
        summary.append("Node.js")
    if stack["fastapi"]:
        summary.append("FastAPI (Python web framework)")
    elif stack["python"]:
        summary.append("Python")
    if stack["go"]:
        summary.append("Go")
    if stack["rust"]:
        summary.append("Rust")
    if stack["docker"]:
        summary.append("Docker")
    if stack["docker_compose"]:
        summary.append("Docker Compose")
    if stack["kubernetes"]:
        summary.append("Kubernetes")
    return summary


def generate_agents_md(
    project_dir: Path,
    output_path: Path,
    include_tree: bool = False,
) -> None:
    """Generate the complete AGENTS.md file for the given project directory."""
    stack = detect_tech_stack(project_dir)
    name = detect_project_name(project_dir)
    description = detect_description(project_dir)
    tech_list = build_tech_stack_summary(stack)
    env_vars = read_env_example(project_dir)
    conventions = detect_conventions(project_dir)

    lines: list[str] = []

    # ── Header ────────────────────────────────────────────────────────────────
    lines += [
        f"# Project: {name}",
        "",
        "<!-- This file was auto-generated by agents-md-gen skill. -->",
        "<!-- Keep it up-to-date whenever project structure changes. -->",
        "",
        "## Overview",
        "",
        description,
        "",
    ]

    if tech_list:
        lines += ["**Tech Stack:**", ""]
        for tech in tech_list:
            lines.append(f"- {tech}")
        lines.append("")

    # ── Architecture / Directory Tree ─────────────────────────────────────────
    if include_tree:
        lines += [
            "## Architecture",
            "",
            "```",
            get_directory_tree(project_dir),
            "```",
            "",
        ]
    else:
        lines += [
            "## Architecture",
            "",
            f"> Run `python scripts/generate.py --project-dir . --include-tree` to see full tree.",
            "",
        ]

    # ── Commands ──────────────────────────────────────────────────────────────
    lines += ["## Commands", "", "| Command | Description |", "|---------|-------------|"]

    if stack["nodejs"]:
        scripts = extract_scripts(project_dir)
        pkg = read_package_json(project_dir)
        manager = "npm"
        if (project_dir / "yarn.lock").exists():
            manager = "yarn"
        elif (project_dir / "pnpm-lock.yaml").exists():
            manager = "pnpm"

        lines.append(f"| {manager} install | Install all dependencies |")
        for script_name, script_cmd in scripts.items():
            lines.append(f"| {manager} run {script_name} | `{script_cmd}` |")

    if stack["python"]:
        for cmd in extract_python_commands(project_dir):
            lines.append(f"| {cmd['command']} | {cmd['description']} |")

    lines.append("")

    # ── Environment Variables ─────────────────────────────────────────────────
    if env_vars:
        lines += [
            "## Environment Variables",
            "",
            "Copy `.env.example` to `.env` and fill in required values.",
            "",
            "| Variable | Required | Default | Description |",
            "|----------|----------|---------|-------------|",
        ]
        for var in env_vars:
            lines.append(
                f"| `{var['name']}` | {var['required']} | "
                f"`{var['default']}` | {var['description']} |"
            )
        lines.append("")
    else:
        lines += [
            "## Environment Variables",
            "",
            "No `.env.example` found. Check source code for required variables.",
            "",
        ]

    # ── Conventions ───────────────────────────────────────────────────────────
    lines += ["## Conventions", ""]
    if conventions:
        for convention in conventions:
            lines.append(f"- {convention}")
    else:
        lines += [
            "- Follow existing code style in each file",
            "- Write tests for all new features",
            "- Document public APIs with docstrings/JSDoc",
        ]
    lines.append("")

    # ── Agent Instructions ────────────────────────────────────────────────────
    lines += [
        "## Agent Instructions",
        "",
        "### Adding New Features",
        "1. Read existing files in the relevant module before writing new code",
        "2. Follow the existing patterns — don't introduce new architectural patterns",
        "3. Add tests for new functionality",
        "4. Update this AGENTS.md if directory structure changes",
        "",
        "### Forbidden Patterns",
        "- Do NOT hardcode secrets or API keys",
        "- Do NOT use `any` type in TypeScript",
        "- Do NOT skip error handling",
        "- Do NOT add placeholder comments like `// TODO: implement`",
        "",
        "### Before Committing",
    ]

    if stack["nodejs"]:
        lines.append("- Run `npm run build` and ensure zero build errors")
        lines.append("- Run `npm run lint` and resolve all lint issues")
    if stack["python"]:
        lines.append("- Run `ruff check .` and `ruff format .`")
        lines.append("- Run `mypy .` for type checking")
    lines += [
        "- Ensure all environment variables are documented here",
        "",
        "---",
        f"*Generated by agents-md-gen skill. Project root: `{project_dir.resolve()}`*",
    ]

    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"✅ AGENTS.md written to: {output_path}")


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Generate AGENTS.md for a project directory",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--project-dir",
        type=Path,
        required=True,
        help="Path to the project root directory",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output path for AGENTS.md (default: <project-dir>/AGENTS.md)",
    )
    parser.add_argument(
        "--include-tree",
        action="store_true",
        default=False,
        help="Include full directory tree in output",
    )
    return parser.parse_args()


def main() -> None:
    """Entry point for AGENTS.md generator."""
    args = parse_args()

    project_dir = args.project_dir.resolve()
    if not project_dir.exists():
        print(f"❌ ERROR: Project directory does not exist: {project_dir}", file=sys.stderr)
        sys.exit(1)
    if not project_dir.is_dir():
        print(f"❌ ERROR: Path is not a directory: {project_dir}", file=sys.stderr)
        sys.exit(1)

    output_path = args.output if args.output else project_dir / "AGENTS.md"
    output_path = output_path.resolve()

    print(f"🔍 Scanning project: {project_dir}")
    print(f"📄 Output path: {output_path}")

    generate_agents_md(project_dir, output_path, include_tree=args.include_tree)


if __name__ == "__main__":
    main()
