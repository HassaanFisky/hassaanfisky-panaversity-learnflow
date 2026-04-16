# PostgreSQL on Kubernetes — Technical Reference

## Overview
This skill deploys a standalone PostgreSQL instance on Kubernetes with:
- Persistent storage via PVC (10Gi default)
- Kubernetes Secret for credentials
- ClusterIP Service for internal access
- Liveness and readiness probes
- Resource limits and requests

## Components Deployed
| Resource | Kind | Description |
|----------|------|-------------|
| `postgres-secret` | Secret | DB credentials (base64 encoded) |
| `postgres-pvc` | PersistentVolumeClaim | 10Gi persistent disk |
| `postgres` | Deployment | Single PostgreSQL pod |
| `postgres-service` | Service | ClusterIP on port 5432 |

## Connection Details
```
Host:     postgres-service.postgres.svc.cluster.local
Port:     5432
Database: (set via POSTGRES_DB env)
User:     (set via POSTGRES_USER env)
Password: (set via POSTGRES_PASSWORD env)
```

## Scaling Considerations
This setup is for **single-instance** PostgreSQL. For HA:
- Use CloudNativePG operator (`cnpg.io`)
- Use Crunchy Data PGO
- Use Zalando Postgres Operator

## Backup Strategy
```bash
# Manual backup from inside cluster
kubectl exec -n postgres deploy/postgres -- \
  pg_dump -U postgres mydb > backup.sql

# Restore
kubectl exec -i -n postgres deploy/postgres -- \
  psql -U postgres mydb < backup.sql
```

## Common Operations
```bash
# Connect via psql
kubectl run psql-test -it --rm \
  --image=postgres:16 \
  --env="PGPASSWORD=yourpassword" \
  -- psql -h postgres-service.postgres.svc.cluster.local -U postgres

# View logs
kubectl logs -n postgres deploy/postgres -f

# Scale to 0 (pause)
kubectl scale deploy/postgres -n postgres --replicas=0

# Scale back up
kubectl scale deploy/postgres -n postgres --replicas=1
```

## Storage Classes
The script uses the default StorageClass. To use a specific one:
```bash
STORAGE_CLASS=ssd ./setup.sh
```

Common StorageClass names:
| Cloud | Storage Class |
|-------|--------------|
| GKE   | standard, premium-rwo |
| EKS   | gp2, gp3 |
| AKS   | default, managed-premium |
| k3s   | local-path |
