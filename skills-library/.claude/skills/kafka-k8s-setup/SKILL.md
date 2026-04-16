---
name: kafka-k8s-setup
description: Deploys a production-grade Strimzi Kafka cluster on Kubernetes
triggers:
  - "set up Kafka on Kubernetes"
  - "deploy Kafka cluster"
  - "install Strimzi Kafka"
steps:
  1. Ensure kubectl and helm are installed and cluster is reachable
  2. Run scripts/setup.sh to install Strimzi operator and deploy Kafka cluster
  3. Verify pods are Running: kubectl get pods -n kafka
  4. Test by producing/consuming a message on test-topic
checklist:
  - [ ] kubectl connected to target cluster
  - [ ] Strimzi operator installed
  - [ ] Kafka cluster CR deployed
  - [ ] All broker pods Running
  - [ ] Zookeeper pods Running (or KRaft mode enabled)
  - [ ] Internal bootstrap service accessible
output: Kafka cluster ready at kafka-cluster-kafka-bootstrap:9092 inside cluster
---
