#!/usr/bin/env env bash
# scripts/setup.sh — Deploy Strimzi Kafka on Kubernetes
# Usage: ./setup.sh [--namespace kafka] [--strimzi-version 0.40.0] [--dry-run]
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────
NAMESPACE="${KAFKA_NAMESPACE:-kafka}"
STRIMZI_VERSION="${STRIMZI_VERSION:-0.40.0}"
KAFKA_VERSION="${KAFKA_VERSION:-3.7.0}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN=false

# ── Color helpers ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Argument parsing ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --namespace) NAMESPACE="$2"; shift 2 ;;
    --strimzi-version) STRIMZI_VERSION="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help)
      echo "Usage: $0 [--namespace NAMESPACE] [--strimzi-version VERSION] [--dry-run]"
      exit 0 ;;
    *) error "Unknown argument: $1" ;;
  esac
done

KUBECTL="kubectl"
if $DRY_RUN; then
  KUBECTL="kubectl --dry-run=client"
  warn "DRY RUN MODE — no changes will be applied"
fi

# ── Prerequisite checks ────────────────────────────────────────────────────────
info "Checking prerequisites..."

if ! command -v kubectl &>/dev/null; then
  error "kubectl is not installed. Install from: https://kubernetes.io/docs/tasks/tools/"
fi

if ! kubectl cluster-info &>/dev/null; then
  error "kubectl cannot connect to a cluster. Configure KUBECONFIG and try again."
fi

KUBE_VERSION=$(kubectl version --client -o json 2>/dev/null | grep -oP '"gitVersion":\s*"\K[^"]+' | head -1 || echo "unknown")
info "kubectl version: ${KUBE_VERSION}"
info "Target namespace: ${NAMESPACE}"
info "Strimzi version: ${STRIMZI_VERSION}"
info "Kafka version: ${KAFKA_VERSION}"

# ── Step 1: Create namespace ───────────────────────────────────────────────────
info "Step 1/7: Creating namespace '${NAMESPACE}'..."
if kubectl get namespace "${NAMESPACE}" &>/dev/null; then
  warn "Namespace '${NAMESPACE}' already exists — skipping creation"
else
  kubectl create namespace "${NAMESPACE}"
  success "Namespace '${NAMESPACE}' created"
fi

# ── Step 2: Install Strimzi operator ──────────────────────────────────────────
info "Step 2/7: Installing Strimzi operator v${STRIMZI_VERSION}..."

STRIMZI_URL="https://strimzi.io/install/latest?namespace=${NAMESPACE}"
STRIMZI_RELEASE_URL="https://github.com/strimzi/strimzi-kafka-operator/releases/download/${STRIMZI_VERSION}/strimzi-cluster-operator-${STRIMZI_VERSION}.yaml"

# Try versioned release first, fall back to latest
if curl -fsSL --head "${STRIMZI_RELEASE_URL}" &>/dev/null; then
  info "Downloading Strimzi operator manifest (versioned)..."
  curl -fsSL "${STRIMZI_RELEASE_URL}" \
    | sed "s/namespace: myproject/namespace: ${NAMESPACE}/g" \
    | kubectl apply -f - -n "${NAMESPACE}"
else
  warn "Versioned manifest not found — falling back to latest"
  curl -fsSL "${STRIMZI_URL}" \
    | sed "s/namespace: myproject/namespace: ${NAMESPACE}/g" \
    | kubectl apply -f - -n "${NAMESPACE}"
fi

success "Strimzi operator manifests applied"

# ── Step 3: Wait for Strimzi operator to be ready ─────────────────────────────
info "Step 3/7: Waiting for Strimzi Cluster Operator to be ready (timeout: 120s)..."
kubectl wait deployment/strimzi-cluster-operator \
  -n "${NAMESPACE}" \
  --for=condition=Available \
  --timeout=120s \
  || error "Strimzi Cluster Operator did not become ready in time. Check: kubectl logs -n ${NAMESPACE} -l name=strimzi-cluster-operator"
success "Strimzi Cluster Operator is ready"

# ── Step 4: Deploy Kafka cluster ───────────────────────────────────────────────
info "Step 4/7: Deploying Kafka cluster from ${SCRIPT_DIR}/kafka-cluster.yaml..."

if [[ ! -f "${SCRIPT_DIR}/kafka-cluster.yaml" ]]; then
  error "kafka-cluster.yaml not found at ${SCRIPT_DIR}/kafka-cluster.yaml"
fi

kubectl apply -f "${SCRIPT_DIR}/kafka-cluster.yaml" -n "${NAMESPACE}"
success "Kafka cluster CR applied"

# ── Step 5: Wait for ZooKeeper ────────────────────────────────────────────────
info "Step 5/7: Waiting for ZooKeeper pods to be ready (timeout: 300s)..."
kubectl wait pods \
  -n "${NAMESPACE}" \
  -l strimzi.io/name=kafka-cluster-zookeeper \
  --for=condition=Ready \
  --timeout=300s \
  || error "ZooKeeper pods did not become ready. Check: kubectl get pods -n ${NAMESPACE}"
success "ZooKeeper pods are ready"

# ── Step 6: Wait for Kafka brokers ────────────────────────────────────────────
info "Step 6/7: Waiting for Kafka broker pods to be ready (timeout: 300s)..."
kubectl wait pods \
  -n "${NAMESPACE}" \
  -l strimzi.io/name=kafka-cluster-kafka \
  --for=condition=Ready \
  --timeout=300s \
  || error "Kafka broker pods did not become ready. Check: kubectl get pods -n ${NAMESPACE}"
success "Kafka broker pods are ready"

# ── Step 7: Apply topic CRs ───────────────────────────────────────────────────
info "Step 7/7: Applying KafkaTopic resources..."
# Topics are defined in kafka-cluster.yaml (separate YAML docs), already applied above
# Wait for Entity Operator that manages topics
kubectl wait pods \
  -n "${NAMESPACE}" \
  -l strimzi.io/name=kafka-cluster-entity-operator \
  --for=condition=Ready \
  --timeout=120s \
  || warn "Entity Operator not yet ready — topics may take a moment to be created"
success "Entity Operator ready — topics will be created shortly"

# ── Final status ───────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Kafka Cluster Deployment Complete!          ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
info "Cluster status:"
kubectl get kafka -n "${NAMESPACE}"
echo ""
info "All pods:"
kubectl get pods -n "${NAMESPACE}"
echo ""
echo -e "${BLUE}Bootstrap address (internal):${NC}"
echo -e "  PLAIN:  kafka-cluster-kafka-bootstrap.${NAMESPACE}.svc.cluster.local:9092"
echo -e "  TLS:    kafka-cluster-kafka-bootstrap.${NAMESPACE}.svc.cluster.local:9093"
echo ""
echo -e "${BLUE}Test with:${NC}"
echo -e "  kubectl -n ${NAMESPACE} run kafka-producer -ti \\"
echo -e "    --image=quay.io/strimzi/kafka:${STRIMZI_VERSION}-kafka-${KAFKA_VERSION} \\"
echo -e "    --rm=true --restart=Never -- \\"
echo -e "    bin/kafka-console-producer.sh \\"
echo -e "    --bootstrap-server kafka-cluster-kafka-bootstrap:9092 \\"
echo -e "    --topic learnflow-events"
