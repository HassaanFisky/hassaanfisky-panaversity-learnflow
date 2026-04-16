#!/usr/bin/env bash
# scripts/setup.sh — Deploy PostgreSQL on Kubernetes with PVC
# Usage: ./setup.sh [--namespace postgres] [--db-name mydb] [--storage-class standard]
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────
NAMESPACE="${POSTGRES_NAMESPACE:-postgres}"
DB_NAME="${POSTGRES_DB:-learnflow}"
DB_USER="${POSTGRES_USER:-learnflow_user}"
DB_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -base64 24 | tr -d '=+/' | head -c 24)}"
STORAGE_CLASS="${STORAGE_CLASS:-}"
STORAGE_SIZE="${STORAGE_SIZE:-10Gi}"
PG_IMAGE="${PG_IMAGE:-postgres:16-alpine}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Color helpers ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Parse arguments ────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --namespace)      NAMESPACE="$2";      shift 2 ;;
    --db-name)        DB_NAME="$2";        shift 2 ;;
    --storage-class)  STORAGE_CLASS="$2";  shift 2 ;;
    --storage-size)   STORAGE_SIZE="$2";   shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--namespace NS] [--db-name DB] [--storage-class CLASS] [--storage-size SIZE]"
      exit 0 ;;
    *) error "Unknown argument: $1" ;;
  esac
done

# ── Prerequisites ──────────────────────────────────────────────────────────────
info "Checking prerequisites..."
command -v kubectl &>/dev/null || error "kubectl not found"
kubectl cluster-info &>/dev/null || error "kubectl cannot reach cluster"

info "Configuration:"
info "  Namespace:     ${NAMESPACE}"
info "  Database:      ${DB_NAME}"
info "  User:          ${DB_USER}"
info "  Storage:       ${STORAGE_SIZE}"
info "  Image:         ${PG_IMAGE}"

# ── Step 1: Namespace ──────────────────────────────────────────────────────────
info "Step 1/6: Ensuring namespace '${NAMESPACE}'..."
kubectl get namespace "${NAMESPACE}" &>/dev/null \
  || kubectl create namespace "${NAMESPACE}"
success "Namespace ready"

# ── Step 2: Secret ────────────────────────────────────────────────────────────
info "Step 2/6: Creating postgres-secret..."
kubectl -n "${NAMESPACE}" get secret postgres-secret &>/dev/null && {
  warn "postgres-secret already exists — skipping"
} || {
  kubectl -n "${NAMESPACE}" create secret generic postgres-secret \
    --from-literal=POSTGRES_DB="${DB_NAME}" \
    --from-literal=POSTGRES_USER="${DB_USER}" \
    --from-literal=POSTGRES_PASSWORD="${DB_PASSWORD}"
  success "postgres-secret created"
  echo ""
  warn "⚠️  Save this password — it will NOT be shown again:"
  echo -e "${YELLOW}  DB Password: ${DB_PASSWORD}${NC}"
  echo ""
}

# ── Step 3: PVC ───────────────────────────────────────────────────────────────
info "Step 3/6: Creating PersistentVolumeClaim (${STORAGE_SIZE})..."

SC_FIELD=""
if [[ -n "${STORAGE_CLASS}" ]]; then
  SC_FIELD="  storageClassName: ${STORAGE_CLASS}"
fi

kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: ${NAMESPACE}
  labels:
    app: postgres
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: ${STORAGE_SIZE}
${SC_FIELD}
EOF
success "PVC created"

# ── Step 4: Deployment ────────────────────────────────────────────────────────
info "Step 4/6: Deploying PostgreSQL..."
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: ${NAMESPACE}
  labels:
    app: postgres
    version: "16"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: ${PG_IMAGE}
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 5432
              name: postgres
          envFrom:
            - secretRef:
                name: postgres-secret
          env:
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
          readinessProbe:
            exec:
              command:
                - sh
                - -c
                - pg_isready -U \$(POSTGRES_USER) -d \$(POSTGRES_DB)
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          livenessProbe:
            exec:
              command:
                - sh
                - -c
                - pg_isready -U \$(POSTGRES_USER) -d \$(POSTGRES_DB)
            initialDelaySeconds: 30
            periodSeconds: 30
            timeoutSeconds: 5
            failureThreshold: 3
      volumes:
        - name: postgres-data
          persistentVolumeClaim:
            claimName: postgres-pvc
      terminationGracePeriodSeconds: 60
EOF
success "PostgreSQL Deployment applied"

# ── Step 5: Service ───────────────────────────────────────────────────────────
info "Step 5/6: Creating ClusterIP Service..."
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: ${NAMESPACE}
  labels:
    app: postgres
spec:
  type: ClusterIP
  selector:
    app: postgres
  ports:
    - name: postgres
      port: 5432
      targetPort: 5432
      protocol: TCP
EOF
success "Service created"

# ── Step 6: Wait for pod ───────────────────────────────────────────────────────
info "Step 6/6: Waiting for PostgreSQL pod to be ready (timeout: 120s)..."
kubectl rollout status deployment/postgres -n "${NAMESPACE}" --timeout=120s \
  || error "Deployment did not become ready. Run: kubectl describe deploy/postgres -n ${NAMESPACE}"
success "PostgreSQL is ready!"

# ── Final summary ──────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ PostgreSQL Deployment Complete!             ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Connection info:${NC}"
echo -e "  Host:     postgres-service.${NAMESPACE}.svc.cluster.local"
echo -e "  Port:     5432"
echo -e "  Database: ${DB_NAME}"
echo -e "  User:     ${DB_USER}"
echo ""
echo -e "${BLUE}Test connection:${NC}"
echo -e "  kubectl run psql-test -it --rm -n ${NAMESPACE} \\"
echo -e "    --image=postgres:16 \\"
echo -e "    --env='PGPASSWORD=${DB_PASSWORD}' \\"
echo -e "    -- psql -h postgres-service -U ${DB_USER} -d ${DB_NAME}"
echo ""
echo -e "${BLUE}Connection string:${NC}"
echo -e "  postgresql://${DB_USER}:${DB_PASSWORD}@postgres-service.${NAMESPACE}.svc.cluster.local:5432/${DB_NAME}"
