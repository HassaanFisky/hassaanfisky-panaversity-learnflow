#!/usr/bin/env bash
# scripts/deploy.sh — Docusaurus GitHub Pages Deployment
# Builds Docusaurus and deploys to gh-pages branch
# Usage: GIT_USER=myuser GITHUB_TOKEN=ghp_xxx ./deploy.sh
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────
GIT_USER="${GIT_USER:-}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
DEPLOYMENT_BRANCH="${DEPLOYMENT_BRANCH:-gh-pages}"
USE_SSH="${USE_SSH:-false}"
PACKAGE_MANAGER="${PACKAGE_MANAGER:-}"
DOCUSAURUS_DIR="${DOCUSAURUS_DIR:-.}"

# ── Color helpers ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Change to Docusaurus directory ─────────────────────────────────────────────
cd "${DOCUSAURUS_DIR}"

# ── Detect package manager ─────────────────────────────────────────────────────
if [[ -z "${PACKAGE_MANAGER}" ]]; then
  if [[ -f "yarn.lock" ]]; then
    PACKAGE_MANAGER="yarn"
  elif [[ -f "pnpm-lock.yaml" ]]; then
    PACKAGE_MANAGER="pnpm"
  else
    PACKAGE_MANAGER="npm"
  fi
fi

info "Package manager: ${PACKAGE_MANAGER}"

# ── Prerequisites ──────────────────────────────────────────────────────────────
info "Checking prerequisites..."

command -v node &>/dev/null || error "Node.js is not installed"
NODE_VERSION=$(node --version)
info "Node.js: ${NODE_VERSION}"

command -v "${PACKAGE_MANAGER}" &>/dev/null || error "${PACKAGE_MANAGER} is not installed"

[[ -f "docusaurus.config.js" || -f "docusaurus.config.ts" ]] \
  || error "docusaurus.config.js/ts not found in: $(pwd)"

if [[ "${USE_SSH}" != "true" ]]; then
  [[ -z "${GIT_USER}" ]] && error "GIT_USER is required when not using SSH"
  [[ -z "${GITHUB_TOKEN}" ]] && error "GITHUB_TOKEN is required when not using SSH"
fi

# ── Validate docusaurus.config ─────────────────────────────────────────────────
info "Validating Docusaurus configuration..."

CONFIG_FILE=""
[[ -f "docusaurus.config.ts" ]] && CONFIG_FILE="docusaurus.config.ts"
[[ -f "docusaurus.config.js" ]] && CONFIG_FILE="docusaurus.config.js"

if [[ -n "${CONFIG_FILE}" ]]; then
  # Check for required fields
  if ! grep -q "organizationName" "${CONFIG_FILE}"; then
    warn "⚠️  'organizationName' not found in ${CONFIG_FILE}"
    warn "    GitHub Pages deployment requires organizationName and projectName"
  fi
  if ! grep -q "projectName" "${CONFIG_FILE}"; then
    warn "⚠️  'projectName' not found in ${CONFIG_FILE}"
  fi
  if grep -q "your-org.github.io\|example.com" "${CONFIG_FILE}"; then
    error "Placeholder URL detected in ${CONFIG_FILE} — update 'url' before deploying"
  fi
fi

# ── Step 1: Install dependencies ───────────────────────────────────────────────
info "Step 1/4: Installing dependencies..."
case "${PACKAGE_MANAGER}" in
  yarn) yarn install --frozen-lockfile ;;
  npm)  npm ci ;;
  pnpm) pnpm install --frozen-lockfile ;;
esac
success "Dependencies installed"

# ── Step 2: Run type check (if TypeScript) ─────────────────────────────────────
if [[ -f "tsconfig.json" ]]; then
  info "Step 2/4: Running TypeScript type check..."
  case "${PACKAGE_MANAGER}" in
    yarn) yarn tsc --noEmit 2>/dev/null && success "TypeScript OK" || warn "TypeScript errors found — proceeding anyway" ;;
    npm)  npx tsc --noEmit 2>/dev/null && success "TypeScript OK" || warn "TypeScript errors found — proceeding anyway" ;;
    pnpm) pnpm exec tsc --noEmit 2>/dev/null && success "TypeScript OK" || warn "TypeScript errors found — proceeding anyway" ;;
  esac
else
  info "Step 2/4: Skipping TypeScript check (no tsconfig.json)"
fi

# ── Step 3: Build ─────────────────────────────────────────────────────────────
info "Step 3/4: Building Docusaurus site..."
case "${PACKAGE_MANAGER}" in
  yarn) yarn build ;;
  npm)  npm run build ;;
  pnpm) pnpm run build ;;
esac

# Verify build output
[[ -d "build" ]] || error "Build failed — 'build/' directory not found"
[[ -f "build/index.html" ]] || error "Build failed — 'build/index.html' not found"

BUILD_SIZE=$(du -sh build | cut -f1)
success "Build complete (${BUILD_SIZE})"

# ── Step 4: Deploy to GitHub Pages ────────────────────────────────────────────
info "Step 4/4: Deploying to GitHub Pages (branch: ${DEPLOYMENT_BRANCH})..."

if [[ "${USE_SSH}" == "true" ]]; then
  info "Using SSH authentication..."
  case "${PACKAGE_MANAGER}" in
    yarn) USE_SSH=true DEPLOYMENT_BRANCH="${DEPLOYMENT_BRANCH}" yarn deploy ;;
    npm)  USE_SSH=true DEPLOYMENT_BRANCH="${DEPLOYMENT_BRANCH}" npm run deploy ;;
    pnpm) USE_SSH=true DEPLOYMENT_BRANCH="${DEPLOYMENT_BRANCH}" pnpm run deploy ;;
  esac
else
  info "Using HTTPS (token) authentication as '${GIT_USER}'..."
  case "${PACKAGE_MANAGER}" in
    yarn)
      GIT_USER="${GIT_USER}" \
      GITHUB_TOKEN="${GITHUB_TOKEN}" \
      DEPLOYMENT_BRANCH="${DEPLOYMENT_BRANCH}" \
        yarn deploy
      ;;
    npm)
      GIT_USER="${GIT_USER}" \
      GITHUB_TOKEN="${GITHUB_TOKEN}" \
      DEPLOYMENT_BRANCH="${DEPLOYMENT_BRANCH}" \
        npm run deploy
      ;;
    pnpm)
      GIT_USER="${GIT_USER}" \
      GITHUB_TOKEN="${GITHUB_TOKEN}" \
      DEPLOYMENT_BRANCH="${DEPLOYMENT_BRANCH}" \
        pnpm run deploy
      ;;
  esac
fi

# ── Final summary ──────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Docusaurus Deployment Complete!             ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""

# Extract GitHub Pages URL from config
REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [[ "${REPO_URL}" =~ github.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
  ORG="${BASH_REMATCH[1]}"
  REPO="${BASH_REMATCH[2]}"
  info "Site should be live at:"
  echo -e "  ${GREEN}https://${ORG}.github.io/${REPO}/${NC}"
  echo ""
  warn "Note: GitHub Pages usually takes 1-3 minutes to publish"
  warn "Check status at: https://github.com/${ORG}/${REPO}/actions"
fi

info "Deployed branch: ${DEPLOYMENT_BRANCH}"
info "Build size: ${BUILD_SIZE}"
