# ADR-029: Kong API Gateway for Microservices

## Status
Accepted

## Context
The Temps D'arrêt platform uses a microservices architecture with multiple independent services (user, invite, portfolio, shoot, file, notification). Each service exposes its own REST API on different ports. We need a unified entry point for:

1. **Routing**: Single endpoint for frontend to access all backend services
2. **Cross-cutting concerns**: CORS, rate limiting, authentication, logging
3. **Service discovery**: Abstract internal service locations from frontend
4. **Traffic management**: Load balancing, retries, timeouts
5. **Observability**: Request tracing, metrics, logging
6. **Security**: Centralized authentication, authorization, TLS termination

Without an API gateway:
- Frontend must know all service endpoints and ports
- Each service must implement its own CORS, rate limiting, auth
- No centralized logging or request tracing
- Difficult to add new cross-cutting concerns
- Security policies are inconsistent across services

## Decision
We will use **Kong Gateway OSS (Open Source)** as the API gateway for all microservices.

### Why Kong?

1. **Open Source & Free**: Apache 2.0 license, self-hosted, no licensing costs
2. **Performance**: Built on NGINX, handles high throughput (10k+ req/s)
3. **Plugin Ecosystem**: 100+ plugins for auth, security, traffic control, logging
4. **Database-backed**: PostgreSQL for configuration persistence
5. **Declarative Config**: YAML-based configuration for GitOps
6. **Admin API**: Full REST API for dynamic configuration
7. **Active Community**: Large community, good documentation, frequent updates
8. **Kubernetes-ready**: Native Kubernetes Ingress controller available

### Architecture

```
┌─────────────┐
│   Frontend  │
│ (SvelteKit) │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  Kong Gateway (:8000)       │
│  ┌────────────────────────┐ │
│  │ Routes & Plugins       │ │
│  │ - CORS                 │ │
│  │ - Rate Limiting        │ │
│  │ - Request ID           │ │
│  │ - Auth (future)        │ │
│  └────────────────────────┘ │
└──────┬──────────────────────┘
       │
       ├────────┬────────┬────────┬────────┬────────┐
       ▼        ▼        ▼        ▼        ▼        ▼
    User    Invite  Portfolio  Shoot    File   Notification
  Service  Service  Service  Service Service  Service
   :3002    :3003    :3004    :3005   :3006    :3007
```

### Service Routes

All services accessible through Kong on port **8000**:

| Service | Route | Internal |
|---------|-------|----------|
| User | `/api/v1/users` | `http://user-service:3002` |
| Invite | `/api/v1/invitations`, `/api/v1/magic-links` | `http://invite-service:3003` |
| Portfolio | `/api/v1/portfolios`, `/api/v1/galleries` | `http://portfolio-service:3004` |
| Shoot | `/api/v1/shoots` | `http://shoot-service:3005` |
| File | `/api/v1/files` | `http://file-service:3006` |
| Notification | `/api/v1/notifications` | `http://notification-service:3007` |

### Global Plugins Enabled

1. **CORS**: Cross-origin requests from frontend (localhost:5173, tempsdarret.studio)
2. **Correlation ID**: Adds `X-Request-ID` header for distributed tracing
3. **Rate Limiting**: 100 req/min, 1000 req/hour per client (global limits)
4. **Request Size Limiting**: Max 100MB payload (for large photo uploads)
5. **Response Transformer**: Remove unnecessary headers (X-Powered-By, Server)

### Configuration Approach

**Hybrid approach** combining Admin API and declarative config:

1. **Initial setup**: Admin API via `configure-services.sh` script
2. **Version control**: Declarative `kong.yml` for GitOps
3. **Runtime changes**: Admin API for dynamic updates
4. **Backup/restore**: Database exports for disaster recovery

## Alternatives Considered

### 1. Nginx
**Pros**: Lightweight, fast, widely used
**Cons**: No plugin ecosystem, limited features, manual Lua scripting required, no admin API

### 2. Traefik
**Pros**: Modern, Docker/K8s native, automatic service discovery
**Cons**: Limited plugin ecosystem, less mature, configuration can be complex

### 3. API Gateway (AWS)
**Pros**: Managed service, no ops burden, integrated with AWS ecosystem
**Cons**: Vendor lock-in, costs, not self-hosted, requires cloud deployment

### 4. Envoy Proxy
**Pros**: Modern, CNCF project, used by Istio
**Cons**: Complex configuration, no admin GUI, steep learning curve

### 5. Custom Gateway (Node.js/Fastify)
**Pros**: Full control, tailored to our needs
**Cons**: Maintenance burden, reinventing the wheel, missing enterprise features

**Decision**: Kong provides the best balance of features, performance, ease of use, and cost (free).

## Consequences

### Positive

1. **Single entry point**: Frontend only needs to know Kong's address
2. **Consistent policies**: CORS, rate limiting, auth applied uniformly
3. **Observability**: Request IDs enable end-to-end tracing
4. **Security**: Centralized authentication (JWT, API keys) ready to implement
5. **Flexibility**: Easy to add new plugins (caching, circuit breaking, logging)
6. **Developer experience**: Scripts for setup, configuration, testing
7. **Documentation**: Comprehensive README and ADR for team onboarding
8. **Production-ready**: Proven at scale (Airbnb, NASA, Samsung)

### Negative

1. **Additional component**: One more service to deploy and maintain
2. **Single point of failure**: If Kong is down, all APIs are inaccessible (mitigate with HA setup)
3. **Latency**: Extra network hop adds ~1-5ms per request (acceptable overhead)
4. **Learning curve**: Team needs to learn Kong Admin API and configuration
5. **Database dependency**: Requires PostgreSQL for configuration storage

### Mitigation Strategies

1. **High availability**: Run multiple Kong instances behind load balancer (production)
2. **Monitoring**: Add health checks, metrics (Prometheus), alerts
3. **Fallback**: Direct service access for emergencies (internal network only)
4. **Documentation**: Comprehensive README, scripts, examples
5. **Automation**: Scripts for setup, configuration, testing

## Implementation

### Files Created

```
infrastructure/kong/
├── docker-compose.yml          # Kong + PostgreSQL stack
├── kong.yml                    # Declarative configuration
├── .env.example                # Environment variables template
├── setup.sh                    # Initialize Kong stack
├── configure-services.sh       # Register services via Admin API
├── test-routes.sh              # Verify routes are working
└── README.md                   # Documentation
```

### Setup Process

```bash
# 1. Start Kong
cd infrastructure/kong
./setup.sh

# 2. Configure services
./configure-services.sh

# 3. Test routes
./test-routes.sh
```

### Integration with Microservices

Each microservice must be on the `tempsdarret_microservices` Docker network:

```yaml
networks:
  - tempsdarret_microservices

networks:
  tempsdarret_microservices:
    external: true
```

### Frontend Integration

Frontend (SvelteKit) will use Kong as the single API endpoint:

```typescript
// Before
const userServiceURL = 'http://localhost:3002/api/v1/users';
const inviteServiceURL = 'http://localhost:3003/api/v1/invitations';

// After
const API_BASE_URL = 'http://localhost:8000';
const usersAPI = `${API_BASE_URL}/api/v1/users`;
const invitationsAPI = `${API_BASE_URL}/api/v1/invitations`;
```

## Future Enhancements

1. **Authentication**: Add JWT plugin for token-based auth
2. **Caching**: Add proxy-cache plugin for frequently accessed data
3. **Monitoring**: Integrate Prometheus + Grafana for metrics
4. **Logging**: Add file-log or syslog plugin for centralized logging
5. **Circuit breaking**: Add health checks and circuit breaker plugins
6. **GraphQL**: Add GraphQL-to-REST translation if needed
7. **WebSocket**: Configure WebSocket support for real-time features
8. **gRPC**: Add gRPC plugin if we adopt gRPC between services

## References

- Kong Documentation: https://docs.konghq.com/
- Kong Admin API: https://docs.konghq.com/gateway/latest/admin-api/
- Kong Plugins: https://docs.konghq.com/hub/
- Kong Docker: https://hub.docker.com/_/kong
- Kong GitHub: https://github.com/Kong/kong

## Notes

- Kong version: 3.7 (latest stable as of implementation)
- License: Apache 2.0 (free, self-hosted)
- Database: PostgreSQL 16
- Deployment: Docker Compose (local), Kubernetes (production)

## Related ADRs

- ADR-001: Event-driven microservices architecture
- ADR-010: Docker containerization strategy
- ADR-028: K3s manager infrastructure (future production deployment)
