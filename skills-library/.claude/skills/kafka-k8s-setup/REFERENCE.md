# Kafka on Kubernetes — Technical Reference (Strimzi)

## Overview
Strimzi is the Kubernetes operator for Apache Kafka. It manages the entire Kafka lifecycle
via CRDs (Custom Resource Definitions): cluster creation, scaling, topic management,
user authentication, and TLS.

## Prerequisites
- Kubernetes cluster ≥ 1.25 (GKE, EKS, AKS, k3s, minikube all work)
- kubectl configured with cluster-admin permissions
- helm ≥ 3.0 (for Strimzi operator install)
- At least 3 worker nodes with 4 CPU / 8 GB RAM each for production

## Strimzi Version Compatibility
| Strimzi | Kafka  | Kubernetes |
|---------|--------|------------|
| 0.40.x  | 3.7.x  | 1.25+      |
| 0.39.x  | 3.6.x  | 1.24+      |
| 0.38.x  | 3.5.x  | 1.23+      |

## Key CRDs
| CRD | Purpose |
|-----|---------|
| `Kafka` | Main cluster resource — brokers, zookeeper, listeners |
| `KafkaTopic` | Manage topics declaratively |
| `KafkaUser` | Manage users with ACLs |
| `KafkaConnect` | Kafka Connect cluster |
| `KafkaMirrorMaker2` | Cross-cluster replication |

## Cluster Resource Overview (kafka-cluster.yaml)
The provided `kafka-cluster.yaml` deploys:
- **3 Kafka brokers** with persistent 10Gi volumes on `standard` StorageClass
- **3 ZooKeeper nodes** with persistent 5Gi volumes
- **PLAIN listener** on port 9092 (internal only)
- **TLS listener** on port 9093 (internal + external)
- JVM heap: 2Gi for brokers, 512Mi for ZooKeeper
- Cruise Control for partition rebalancing

## Service Endpoints
After deployment, these services are created:
```
kafka-cluster-kafka-bootstrap:9092    # PLAIN — internal
kafka-cluster-kafka-bootstrap:9093    # TLS — internal
kafka-cluster-zookeeper-client:2181   # ZK (internal only)
```

## Testing the Cluster
```bash
# Produce messages
kubectl -n kafka run kafka-producer -ti \
  --image=quay.io/strimzi/kafka:0.40.0-kafka-3.7.0 \
  --rm=true --restart=Never -- bin/kafka-console-producer.sh \
  --bootstrap-server kafka-cluster-kafka-bootstrap:9092 \
  --topic test-topic

# Consume messages (new terminal)
kubectl -n kafka run kafka-consumer -ti \
  --image=quay.io/strimzi/kafka:0.40.0-kafka-3.7.0 \
  --rm=true --restart=Never -- bin/kafka-console-consumer.sh \
  --bootstrap-server kafka-cluster-kafka-bootstrap:9092 \
  --topic test-topic --from-beginning
```

## Common Issues
| Issue | Cause | Fix |
|-------|-------|-----|
| Pods stuck in Pending | No storage class or insufficient resources | Check `kubectl describe pod` |
| Broker CrashLoopBackOff | ZK not ready yet | Wait; ZK must be Running first |
| Consumer lag growing | Not enough partitions | Increase partition count in KafkaTopic |
| JVM OutOfMemory | Heap too small | Increase `jvmOptions.xmx` in Kafka CR |

## Production Hardening
- Enable TLS on all listeners
- Create `KafkaUser` resources with SCRAM-SHA-512 auth
- Set `retention.ms` and `retention.bytes` per topic
- Enable Cruise Control for auto-rebalancing
- Configure Prometheus metrics via `metricsConfig`
