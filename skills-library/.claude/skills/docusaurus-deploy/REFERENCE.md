# Docusaurus GitHub Pages Deploy — Technical Reference

## Overview
Docusaurus v3 has a built-in `deploy` command that builds the static site and
pushes to the `gh-pages` branch. This skill wraps it with prerequisite checks,
config validation, and build verification.

## Prerequisites
- Node.js 18+
- Yarn or npm
- Git remote `origin` set to the GitHub repo
- `docusaurus.config.js` with correct `url` and `baseUrl`
- `GITHUB_TOKEN` with `repo` scope OR SSH key configured
- GitHub Pages enabled for the repo (Settings > Pages > Branch: gh-pages)

## Configuration Checklist
```javascript
// docusaurus.config.js — required fields
const config = {
  title: 'My Docs',
  url: 'https://myorg.github.io',      // ← Must match GitHub Pages URL
  baseUrl: '/my-repo/',                 // ← Must match repo name + trailing slash
  organizationName: 'myorg',           // ← GitHub org or username
  projectName: 'my-repo',             // ← GitHub repo name
  deploymentBranch: 'gh-pages',       // ← Branch for Pages content
  trailingSlash: false,
};
```

## Environment Variables
| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub PAT with `repo` write access |
| `GIT_USER` | GitHub username or org for committing |
| `DEPLOYMENT_BRANCH` | Branch to push to (default: `gh-pages`) |
| `USE_SSH` | Set to `true` to use SSH instead of HTTPS |

## Deploy Commands
```bash
# Using HTTPS + token
GIT_USER=<username> \
GITHUB_TOKEN=<token> \
  yarn deploy

# Using SSH (if SSH key configured)
USE_SSH=true yarn deploy

# Custom branch
DEPLOYMENT_BRANCH=docs yarn deploy
```

## Common Issues
| Issue | Cause | Fix |
|-------|-------|-----|
| 404 on site | Wrong `baseUrl` | Must match repo name: `/repo-name/` |
| Auth failure | Token missing `repo` scope | Regenerate PAT with correct scope |
| Build fails | Missing plugin | `yarn add @docusaurus/plugin-xxx` |
| Green pages but 404 | Pages not enabled | Enable in GitHub Settings > Pages |

## Search Setup
```bash
# Add Algolia DocSearch (recommended)
yarn add @docusaurus/plugin-content-docs

# Or local search
yarn add @easyops-cn/docusaurus-search-local
```

## Versioning
```bash
# Create a versioned snapshot
yarn docusaurus docs:version 1.0.0
# This copies current docs to versioned_docs/version-1.0.0/
```
