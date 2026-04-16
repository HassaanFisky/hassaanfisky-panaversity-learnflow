#!/usr/bin/env bash
# scripts/deploy.sh — Next.js to Kubernetes CI/CD Pipeline
# Builds Docker image, pushes to registry, and deploys to Kubernetes
# Usage: DOCKER_IMAGE=ghcr.io/org/app ./deploy.sh
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────
DOCKER_IMAGE="${DOCKER_IMAGE:-}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo "latest")}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
DOCKER_USERNAME="${DOCKER_USERNAME:-}"
DOCKER_PASSWORD="${DOCKER_PASSWORD:-}"
K8S_NAMESPACE="${K8S_NAMESPACE:-default}"
K8S_DEPLOYMENT="${K8S_DEPLOYMENT:-nextjs-app}"
K8S_DIR="${K8S_DIR:-k8s}"
DOCKERFILE_PATH="${DOCKERFILE_PATH:-Dockerfile}"
BUILD_CONTEXT="${BUILD_CONTEXT:-.}"

# ── Color helpers ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Validation ─────────────────────────────────────────────────────────────────
[[ -z "${DOCKER_IMAGE}" ]] && error "DOCKER_IMAGE is required (e.g. ghcr.io/org/app)"
command -v docker &>/dev/null || error "Docker is not installed or not in PATH"
command -v kubectl &>/dev/null || error "kubectl is not installed"
kubectl cluster-info &>/dev/null || error "kubectl cannot connect to cluster"
[[ -d "${K8S_DIR}" ]] || error "k8s/ directory not found at: ${K8S_DIR}"

FULL_IMAGE="${DOCKER_IMAGE}:${IMAGE_TAG}"
LATEST_IMAGE="${DOCKER_IMAGE}:latest"

info "Deploy configuration:"
info "  Image:       ${FULL_IMAGE}"
info "  Registry:    ${DOCKER_REGISTRY}"
info "  Namespace:   ${K8S_NAMESPACE}"
info "  Deployment:  ${K8S_DEPLOYMENT}"
info "  Git SHA:     ${IMAGE_TAG}"

# ── Step 1: Registry login ─────────────────────────────────────────────────────
if [[ -n "${DOCKER_USERNAME}" && -n "${DOCKER_PASSWORD}" ]]; then
  info "Step 1/5: Logging into ${DOCKER_REGISTRY}..."
  echo "${DOCKER_PASSWORD}" | docker login "${DOCKER_REGISTRY}" \
    --username "${DOCKER_USERNAME}" --password-stdin
  success "Logged into registry"
else
  info "Step 1/5: Skipping registry login (DOCKER_USERNAME/DOCKER_PASSWORD not set)"
  warn "Assuming pre-authenticated registry"
fi

# ── Step 2: Build Docker image ─────────────────────────────────────────────────
info "Step 2/5: Building Docker image..."

# Check for next.config.js standalone mode
if [[ -f "next.config.js" || -f "next.config.ts" || -f "next.config.mjs" ]]; then
  if ! grep -q "standalone" next.config.* 2>/dev/null; then
    warn "⚠️  next.config does not appear to have 'output: standalone'"
    warn "    Multi-stage Docker builds require: output: 'standalone' in next.config.js"
  fi
fi

docker build \
  --file "${DOCKERFILE_PATH}" \
  --tag "${FULL_IMAGE}" \
  --tag "${LATEST_IMAGE}" \
  --label "git.sha=${IMAGE_TAG}" \
  --label "built.at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --cache-from "${LATEST_IMAGE}" \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  "${BUILD_CONTEXT}"

success "Docker image built: ${FULL_IMAGE}"

# ── Step 3: Push image to registry ────────────────────────────────────────────
info "Step 3/5: Pushing image to registry..."
docker push "${FULL_IMAGE}"
docker push "${LATEST_IMAGE}"
success "Image pushed: ${FULL_IMAGE}"

# ── Step 4: Update image tag in K8s manifests ─────────────────────────────────
info "Step 4/5: Applying Kubernetes manifests from ${K8S_DIR}/..."

# Replace image placeholder in manifests (sed in-place backup)
TEMP_K8S_DIR=$(mktemp -d)
cp -r "${K8S_DIR}/." "${TEMP_K8S_DIR}/"

# Substitute image reference in deployment.yaml
if [[ -f "${TEMP_K8S_DIR}/deployment.yaml" ]]; then
  sed -i.bak \
    "s|image: .*${K8S_DEPLOYMENT}.*|image: ${FULL_IMAGE}|g" \
    "${TEMP_K8S_DIR}/deployment.yaml"
fi

# Apply all manifests
kubectl apply -f "${TEMP_K8S_DIR}/" -n "${K8S_NAMESPACE}" --record 2>/dev/null || \
  kubectl apply -f "${TEMP_K8S_DIR}/" -n "${K8S_NAMESPACE}"

rm -rf "${TEMP_K8S_DIR}"
success "Kubernetes manifests applied"

# ── Step 5: Wait for rollout ───────────────────────────────────────────────────
info "Step 5/5: Waiting for deployment rollout (timeout: 180s)..."
kubectl rollout status deployment/"${K8S_DEPLOYMENT}" \
  -n "${K8S_NAMESPACE}" \
  --timeout=180s \
  || {
    error "Deployment rollout failed. Diagnosing..."
    kubectl describe deployment/"${K8S_DEPLOYMENT}" -n "${K8S_NAMESPACE}"
    kubectl get events -n "${K8S_NAMESPACE}" --sort-by='.lastTimestamp' | tail -20
    # Rollback on failure
    warn "Rolling back to previous version..."
    kubectl rollout undo deployment/"${K8S_DEPLOYMENT}" -n "${K8S_NAMESPACE}"
    exit 1
  }

success "Deployment rollout complete!"

# ── Final summary ──────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Next.js Deployment Complete!                ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""

# Show pod status
info "Current pods:"
kubectl get pods -n "${K8S_NAMESPACE}" -l "app=${K8S_DEPLOYMENT}"
echo ""

# Show ingress URL if exists
INGRESS=$(kubectl get ingress -n "${K8S_NAMESPACE}" -l "app=${K8S_DEPLOYMENT}" \
  -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "")
if [[ -n "${INGRESS}" ]]; then
  success "Live at: https://${INGRESS}"
fi

info "Image deployed: ${FULL_IMAGE}"
