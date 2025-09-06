# ADR-028: Adopt k3s-manager for Local Infrastructure Management

## Status
**Accepted** - 2025-01-09

## Context

The Temps D'arrêt project requires robust local development and production-like deployment capabilities. Our initial approach involved complex shell scripts, Makefiles, Helm templates, and custom TypeScript tooling to manage Docker Compose and Kubernetes configurations.

However, we discovered an existing, proven solution: the [k3s-manager](https://github.com/romdj/local-k8s-cluster) project (v1.0.0) which provides exactly the infrastructure management capabilities we need.

### Current State Before Decision
- Complex infrastructure setup with multiple approaches (Docker Compose + Kubernetes)
- Custom Helm templating with shell script generation
- TypeScript-based configuration management (in development)
- Manual orchestration of infrastructure components
- No built-in monitoring or GitOps workflows

### Problems Identified
1. **Maintenance Overhead**: Multiple tooling approaches require ongoing maintenance
2. **Complexity**: Helm templates + shell scripts + TypeScript tools create cognitive overhead
3. **Missing Platform Services**: No built-in monitoring, GitOps, or ingress management
4. **Development/Production Gap**: Different tooling for local vs. production deployments
5. **Script-Heavy Approach**: Contradicts preference for code-over-scripts philosophy

## Decision

We will adopt the **k3s-manager** tool as the foundation for all local infrastructure management, replacing our complex custom tooling.

### What k3s-manager Provides
- **Production-grade K3s cluster management** with single binary deployment
- **Automated platform services** (ArgoCD, Prometheus, Grafana, Loki, ingress)
- **Type-safe Go tooling** instead of shell scripts and Makefiles
- **Multi-environment support** (dev/staging/production namespaces)
- **GitOps workflows** ready out of the box
- **Proven architecture** supporting 5-25 applications

### Architecture Alignment
```
k3s-manager Platform Services:
├── ArgoCD (GitOps)
├── Prometheus + Grafana (Monitoring)  
├── Loki (Logging)
├── Traefik (Ingress)
└── Namespace Management

Temps D'arrêt Applications:
├── platform/ (Infrastructure)
│   ├── MongoDB
│   ├── Redis
│   ├── Kafka + Zookeeper
├── production/ (Services)
│   ├── Frontend (SvelteKit)
│   ├── API Gateway (Fastify)
│   ├── Notification Service + Payload CMS
│   └── Future services (File, Invite)
```

## Implementation Plan

### Phase 1: Infrastructure Cleanup ✅
- [x] Remove entire `/infrastructure/run-local/` directory with complex tooling
- [x] Clean up Helm templates, shell scripts, Makefiles, and TypeScript generators
- [x] Create new `/infrastructure/k3s-deployment/` structure

### Phase 2: Manifest Creation
- [ ] Create Kubernetes manifests for platform services (MongoDB, Redis, Kafka)
- [ ] Create Kubernetes manifests for application services (Frontend, API Gateway, Notifications)
- [ ] Structure manifests following k3s-manager conventions

### Phase 3: Documentation & Workflows
- [ ] Create comprehensive deployment documentation
- [ ] Define development workflows using k3s-manager
- [ ] Update CI/CD processes to work with k3s cluster deployments

### Phase 4: Migration & Testing
- [ ] Migrate development workflows to k3s-manager
- [ ] Test multi-environment deployments
- [ ] Validate monitoring and GitOps integrations

## Consequences

### Positive
- **Reduced Complexity**: Single tool replaces multiple custom solutions
- **Production Parity**: Same K3s technology for dev and production
- **Built-in Observability**: Monitoring and logging included out of the box
- **GitOps Ready**: ArgoCD integration for automated deployments
- **Type Safety**: Go-based tooling instead of error-prone scripts
- **Proven Solution**: Battle-tested tool with established patterns
- **Better Developer Experience**: Single CLI for all infrastructure operations

### Negative
- **External Dependency**: Reliance on k3s-manager releases and maintenance
- **Learning Curve**: Team needs to learn k3s-manager workflows
- **Migration Effort**: Existing Docker Compose workflows need adaptation

### Neutral
- **Technology Shift**: Moving from Docker Compose to K3s for local development
- **Manifest Management**: Still need to maintain Kubernetes manifests (but simpler than Helm)

## Compliance

This decision aligns with our architectural principles:
- **ADR-001**: Supports microservices architecture with proper service isolation
- **ADR-018**: Maintains Docker containerization with better orchestration
- **ADR-017**: Enables progressive deployment through namespace management
- **Code-over-Scripts Philosophy**: Replaces shell scripts with type-safe Go tooling

## Monitoring

Success will be measured by:
- **Developer Productivity**: Time to set up local development environment
- **Deployment Reliability**: Consistency between environments
- **Operational Visibility**: Monitoring and observability coverage
- **Maintenance Overhead**: Reduced infrastructure maintenance burden

## Related Documents
- [k3s-manager Documentation](https://github.com/romdj/local-k8s-cluster)
- [Getting Started Guide](../infrastructure/k3s-deployment/README.md)
- [Platform Architecture](https://github.com/romdj/local-k8s-cluster/blob/main/platform_architecture.md)