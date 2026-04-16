---
name: agents-md-gen
description: Generates a comprehensive AGENTS.md file for any project by scanning its structure
triggers:
  - "generate AGENTS.md"
  - "create agents file"
  - "document project for AI agents"
steps:
  1. Run scripts/generate.py with --project-dir pointing to target project root
  2. Review generated AGENTS.md for accuracy
  3. Commit AGENTS.md to project root
checklist:
  - [ ] Project directory exists and is readable
  - [ ] generate.py executed with correct --project-dir
  - [ ] AGENTS.md created at project root
  - [ ] Sections: Overview, Architecture, Commands, Env Vars, Conventions
output: AGENTS.md at project root (~50-200 lines)
---
