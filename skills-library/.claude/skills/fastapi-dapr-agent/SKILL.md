---
name: fastapi-dapr-agent
description: Scaffolds a production FastAPI + Dapr microservice with Dockerfile and K8s manifests
triggers:
  - "create FastAPI Dapr service"
  - "scaffold dapr agent"
  - "new microservice with dapr"
steps:
  1. Run scripts/scaffold.py --name <service-name> --port <port>
  2. Review generated files in ./<service-name>/
  3. Build Docker image: docker build -t <image> .
  4. Apply k8s manifests: kubectl apply -f k8s/
checklist:
  - [ ] Service name provided (lowercase, hyphenated)
  - [ ] scaffold.py executed successfully
  - [ ] main.py, routes/, Dockerfile, k8s/ generated
  - [ ] Dapr annotations present in k8s/deployment.yaml
  - [ ] .env copied and secrets filled
output: Complete FastAPI+Dapr service directory ready to build and deploy
---
