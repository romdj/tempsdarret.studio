# Temps D'arrêt K3s Deployment

This directory contains everything needed to deploy the complete Temps D'arrêt photography platform using the **k3s-manager** tool.

## Overview

We use the [k3s-manager](https://github.com/romdj/local-k8s-cluster) (v1.0.0) for:
- ✅ **Production-grade K3s cluster management**
- ✅ **Automated platform services** (ArgoCD, monitoring, ingress)
- ✅ **Type-safe Go tooling** instead of shell scripts
- ✅ **Multi-environment support** (dev/staging/production)
- ✅ **GitOps workflows** out of the box

## Quick Start

### 1. Install k3s-manager

Download the latest release for your platform:

```bash
# macOS Apple Silicon
curl -L -o k3s-manager.tar.gz https://github.com/romdj/local-k8s-cluster/releases/download/v1.0.0/k3s-manager-darwin-arm64.tar.gz

# macOS Intel
curl -L -o k3s-manager.tar.gz https://github.com/romdj/local-k8s-cluster/releases/download/v1.0.0/k3s-manager-darwin-amd64.tar.gz

# Linux
curl -L -o k3s-manager.tar.gz https://github.com/romdj/local-k8s-cluster/releases/download/v1.0.0/k3s-manager-linux-amd64.tar.gz

# Extract and install
tar -xzf k3s-manager.tar.gz
sudo mv k3s-manager-* /usr/local/bin/k3s-manager
chmod +x /usr/local/bin/k3s-manager

# Verify installation
k3s-manager --version
```

### 2. Create Local K3s Cluster

```bash
# Install k3d if not already installed
brew install k3d  # macOS
# or
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# Create cluster with proper port mappings
k3d cluster create tempsdarret \
  --servers 1 \
  --agents 2 \
  --port "80:80@loadbalancer" \
  --port "443:443@loadbalancer" \
  --port "3000:3000@loadbalancer" \
  --port "5173:5173@loadbalancer"

# Verify cluster is running
kubectl get nodes
k3s-manager cluster status
```

### 3. Setup Platform Services

```bash
# Install ArgoCD, monitoring, ingress, and other platform services
k3s-manager setup platform

# Check platform services
k3s-manager cluster status
kubectl get pods -n argocd
kubectl get pods -n monitoring
```

### 4. Deploy Temps D'arrêt

```bash
# Deploy platform infrastructure (databases, message queues)
k3s-manager apps deploy tempsdarret-platform --namespace platform

# Deploy application services (frontend, API, notifications)
k3s-manager apps deploy tempsdarret-services --namespace production

# Monitor deployment
k3s-manager cluster status
k3s-manager apps list --namespace production
```

### 5. Access the Platform

Once deployed, access the platform:

- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:3000
- **Admin UI (Payload CMS)**: http://localhost:3001
- **ArgoCD**: http://localhost:8080 (admin / get with `kubectl get secret argocd-initial-admin-secret -n argocd`)
- **Grafana**: http://localhost:3001 (admin / admin)

## Directory Structure

```
k3s-deployment/
├── README.md                   # This file
├── manifests/                  # Kubernetes manifests
│   ├── platform/              # Infrastructure services
│   │   ├── mongodb/
│   │   ├── redis/
│   │   ├── kafka/
│   │   └── zookeeper/
│   └── services/              # Application services
│       ├── frontend/
│       ├── api-gateway/
│       ├── notification-service/
│       ├── file-service/
│       └── invite-service/
├── config/                    # Configuration files
│   ├── values.yaml           # Shared configuration
│   ├── secrets.example.yaml  # Secret templates
│   └── environments/         # Environment-specific configs
│       ├── development.yaml
│       ├── staging.yaml
│       └── production.yaml
└── docs/                     # Additional documentation
    ├── development.md
    ├── production-deployment.md
    └── monitoring.md
```

## Development Workflow

### Typical Development Session

```bash
# 1. Start cluster and platform
k3d cluster create tempsdarret-dev
k3s-manager setup platform

# 2. Build application images
docker build -t frontend:dev ./frontend
docker build -t api-gateway:dev ./api-gateway
docker build -t notification-service:dev ./services/notification-service

# 3. Deploy applications
k3s-manager apps deploy tempsdarret-services --namespace dev

# 4. Develop and iterate
# Make changes to code
docker build -t frontend:dev ./frontend
kubectl rollout restart deployment/frontend -n dev

# 5. Monitor and debug
k3s-manager apps status tempsdarret-services --namespace dev
kubectl logs -f deployment/frontend -n dev

# 6. Clean up when done
k3d cluster delete tempsdarret-dev
```

### Multi-Environment Development

```bash
# Development environment
k3d cluster create tempsdarret-dev --port "5173:5173@loadbalancer"
k3s-manager apps deploy tempsdarret-services --namespace dev

# Staging environment  
k3d cluster create tempsdarret-staging --port "5174:5173@loadbalancer"
k3s-manager apps deploy tempsdarret-services --namespace staging

# Switch between environments
kubectl config use-context k3d-tempsdarret-dev
kubectl config use-context k3d-tempsdarret-staging
```

## Production Deployment

For production deployment on a Linux server, see the [k3s-manager production guide](https://github.com/romdj/local-k8s-cluster/blob/main/server_init.md).

Quick summary:
```bash
# On your Linux server
curl -sfL https://get.k3s.io | sh -
k3s-manager setup platform
k3s-manager apps deploy tempsdarret-platform --namespace platform
k3s-manager apps deploy tempsdarret-services --namespace production
```

## Key Advantages

### Over Previous Docker Compose Approach
- ✅ **Production-ready**: Same K3s technology used in production
- ✅ **GitOps ready**: ArgoCD integration for automated deployments
- ✅ **Monitoring included**: Prometheus, Grafana, Loki out of the box
- ✅ **Multi-environment**: Easy dev/staging/production separation
- ✅ **Scalable**: Can handle 5-25 applications easily

### Over Complex Helm Setup
- ✅ **No template complexity**: Simple Kubernetes manifests
- ✅ **No shell scripting**: Type-safe Go tooling
- ✅ **Proven tooling**: Battle-tested k3s-manager
- ✅ **Better DevEx**: Single CLI for all operations

## Troubleshooting

### Common Issues

#### k3s-manager not found
```bash
# Re-download and install
curl -L -o k3s-manager.tar.gz https://github.com/romdj/local-k8s-cluster/releases/download/v1.0.0/k3s-manager-darwin-arm64.tar.gz
tar -xzf k3s-manager.tar.gz && sudo mv k3s-manager-* /usr/local/bin/k3s-manager
```

#### Cluster not starting
```bash
# Clean and recreate
k3d cluster delete tempsdarret
k3d cluster create tempsdarret --wait
k3s-manager cluster status
```

#### Services not accessible
```bash
# Check port mappings
k3d cluster list
kubectl get svc -A

# Use port forwarding as alternative
kubectl port-forward -n production service/frontend-service 5173:5173
```

### Getting Help

```bash
# k3s-manager help
k3s-manager --help
k3s-manager cluster --help
k3s-manager apps --help

# Cluster debugging  
k3s-manager --verbose cluster status
kubectl get events --sort-by=.metadata.creationTimestamp
```

## Next Steps

1. **Deploy your first application**: Follow the Quick Start guide
2. **Set up monitoring**: Explore Grafana dashboards at http://localhost:3001
3. **Configure GitOps**: Connect ArgoCD to your Git repositories
4. **Scale to production**: Use the server deployment guide

---

**Questions?** Check the [k3s-manager documentation](https://github.com/romdj/local-k8s-cluster) or create an issue.