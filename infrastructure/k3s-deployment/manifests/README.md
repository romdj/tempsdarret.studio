# Temps D'arrêt Kubernetes Manifests

This directory contains Kubernetes manifests for the Temps D'arrêt photography platform, organized for use with k3s-manager.

## Structure

```
manifests/
├── platform/           # Infrastructure services (shared across environments)
│   ├── mongodb/        # MongoDB database
│   ├── redis/          # Redis cache
│   ├── kafka/          # Apache Kafka message broker
│   └── zookeeper/      # Zookeeper (Kafka dependency)
└── services/           # Application services
    ├── frontend/       # SvelteKit frontend
    ├── api-gateway/    # API Gateway and routing
    ├── notification-service/  # Email/SMS notifications + Payload CMS
    ├── file-service/   # File upload and processing (future)
    └── invite-service/ # Magic link invitations (future)
```

## Deployment Order

1. **Platform services first** (databases, message queues)
2. **Application services second** (frontend, APIs)

```bash
# Deploy infrastructure
k3s-manager apps deploy tempsdarret-platform --namespace platform

# Then deploy applications  
k3s-manager apps deploy tempsdarret-services --namespace production
```

## Namespace Strategy

- `platform`: Shared infrastructure services
- `production`: Production application services
- `staging`: Staging environment services
- `dev`: Development environment services

## Configuration

All services use:
- ConfigMaps for non-sensitive configuration
- Secrets for sensitive data (passwords, API keys)
- PersistentVolumes for data storage
- Services for internal communication
- Ingress for external access

Example service URLs:
- `mongodb-service.platform.svc.cluster.local:27017`
- `redis-service.platform.svc.cluster.local:6379`
- `kafka-service.platform.svc.cluster.local:9092`