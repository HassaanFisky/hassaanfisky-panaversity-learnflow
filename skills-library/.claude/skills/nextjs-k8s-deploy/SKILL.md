---
name: nextjs-k8s-deploy
description: Full CI/CD pipeline to build Next.js Docker image, push to registry, and deploy to Kubernetes
triggers:
  - "deploy Next.js to Kubernetes"
  - "build and push Next.js image"
  - "k8s deploy nextjs"
steps:
  1. Set DOCKER_IMAGE, DOCKER_REGISTRY, K8S_NAMESPACE env vars
  2. Run scripts/deploy.sh to build, push, and apply k8s manifests
  3. Verify rollout: kubectl rollout status deploy/<name>
  4. Check ingress for public URL
checklist:
  - [ ] Docker daemon running
  - [ ] kubectl connected to target cluster
  - [ ] DOCKER_REGISTRY and credentials configured
  - [ ] k8s/ directory exists with deployment.yaml, service.yaml, ingress.yaml
  - [ ] Image pushed successfully
  - [ ] Rollout complete
output: Next.js app running on Kubernetes with Ingress URL
---
