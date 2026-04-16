---
name: postgres-k8s-setup
description: Deploys PostgreSQL on Kubernetes with persistent storage and health checks
triggers:
  - "set up PostgreSQL on Kubernetes"
  - "deploy Postgres to k8s"
  - "install PostgreSQL cluster"
steps:
  1. Ensure kubectl is connected to target cluster
  2. Run scripts/setup.sh to deploy PostgreSQL with PVC
  3. Verify pod is Running: kubectl get pods -n postgres
  4. Test connection via psql inside a test pod
checklist:
  - [ ] kubectl connected to target cluster
  - [ ] StorageClass available (kubectl get storageclass)
  - [ ] Secret created with DB credentials
  - [ ] PVC bound
  - [ ] PostgreSQL pod Running and Ready
  - [ ] Service accessible on port 5432
output: PostgreSQL ready at postgres-service.postgres.svc.cluster.local:5432
---
