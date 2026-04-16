# Next.js Kubernetes Deploy — Technical Reference

## Overview
This skill provides a complete CI/CD bash pipeline for deploying Next.js applications
to Kubernetes. It handles: Docker multi-stage build, registry push, and kubectl rollout.

## Expected k8s/ Directory Structure
```
k8s/
├── deployment.yaml    # Next.js Deployment with resource limits
├── service.yaml       # ClusterIP Service
├── ingress.yaml       # Ingress with TLS (cert-manager)
└── configmap.yaml     # Non-secret env vars
```

## Required Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `DOCKER_IMAGE` | Yes | Full image name, e.g. `ghcr.io/org/app` |
| `IMAGE_TAG` | No | Tag, default: `git rev-parse --short HEAD` |
| `DOCKER_REGISTRY` | Yes | Registry hostname, e.g. `ghcr.io` |
| `DOCKER_USERNAME` | Yes | Registry login username |
| `DOCKER_PASSWORD` | Yes | Registry token/password |
| `K8S_NAMESPACE` | No | Target namespace, default: `default` |
| `K8S_DEPLOYMENT` | No | Deployment name, default: `nextjs-app` |

## Multi-Stage Dockerfile (generated)
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Requires `output: 'standalone'` in `next.config.js`.

## Deployment Rollout Strategy
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```
This ensures zero-downtime deployments.

## Health Check Endpoint
Add to Next.js:
```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}
```
