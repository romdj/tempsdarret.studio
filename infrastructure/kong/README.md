# Kong API Gateway

Kong Gateway OSS (Open Source) API management layer for Temps D'arrêt microservices.

## Overview

Kong Gateway acts as a centralized entry point for all API traffic, providing:
- **Request routing** to microservices
- **Rate limiting** and traffic control
- **CORS** configuration for frontend access
- **Request/response transformation**
- **Authentication** and authorization
- **Monitoring** and observability

## Architecture

```
┌─────────────┐
│   Frontend  │
│ (SvelteKit) │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│     Kong Gateway (8000)     │
│  ┌─────────────────────┐   │
│  │  Routes & Plugins   │   │
│  └─────────────────────┘   │
└──────┬──────────────────────┘
       │
       ├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
       ▼              ▼              ▼              ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│    User     │ │   Invite    │ │  Portfolio  │ │    Shoot    │ │    File     │ │Notification │
│  Service    │ │  Service    │ │  Service    │ │  Service    │ │  Service    │ │  Service    │
│   :3002     │ │   :3003     │ │   :3004     │ │   :3005     │ │   :3006     │ │   :3007     │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

## Quick Start

### 1. Start Kong Gateway

```bash
cd infrastructure/kong
docker-compose up -d
```

This will start:
- **PostgreSQL** (port 5432) - Kong's database
- **Kong Gateway** (port 8000) - HTTP proxy
- **Kong Admin API** (port 8001) - Management API
- **Kong Manager** (port 8002) - Web UI (optional)

### 2. Verify Kong is Running

```bash
# Check Kong status
curl -i http://localhost:8001/status

# Check Kong services
curl -i http://localhost:8001/services
```

### 3. Configure Services and Routes

Kong can be configured in two ways:

#### Option A: Declarative Configuration (Recommended)

```bash
# Apply kong.yml configuration
docker exec kong-gateway kong config db_import /path/to/kong.yml
```

#### Option B: Admin API

```bash
# Create a service
curl -i -X POST http://localhost:8001/services \
  --data name=user-service \
  --data url=http://user-service:3002

# Create a route
curl -i -X POST http://localhost:8001/services/user-service/routes \
  --data paths[]=/api/v1/users \
  --data strip_path=false
```

### 4. Test API Gateway

```bash
# Test user service through Kong
curl -i http://localhost:8000/api/v1/users

# Check headers for request ID
curl -i http://localhost:8000/api/v1/users | grep X-Request-ID
```

## Service Routes

All services are accessible through Kong on port **8000**:

| Service | Route | Upstream |
|---------|-------|----------|
| User Service | `/api/v1/users` | `http://user-service:3002` |
| Invite Service | `/api/v1/invitations`, `/api/v1/magic-links` | `http://invite-service:3003` |
| Portfolio Service | `/api/v1/portfolios`, `/api/v1/galleries` | `http://portfolio-service:3004` |
| Shoot Service | `/api/v1/shoots` | `http://shoot-service:3005` |
| File Service | `/api/v1/files` | `http://file-service:3006` |
| Notification Service | `/api/v1/notifications` | `http://notification-service:3007` |

## Plugins Enabled

### Global Plugins

- **CORS**: Cross-origin resource sharing for frontend
- **Rate Limiting**: 100 requests/minute, 1000 requests/hour per client
- **Request ID**: Adds `X-Request-ID` header for distributed tracing
- **Request Size Limiting**: Max 100MB payload
- **Response Transformer**: Removes unnecessary headers

### Service-Specific Plugins

Plugins can be added per-service or per-route:

```bash
# Add authentication to a service
curl -X POST http://localhost:8001/services/user-service/plugins \
  --data name=jwt

# Add custom rate limiting to file service
curl -X POST http://localhost:8001/services/file-service/plugins \
  --data name=rate-limiting \
  --data config.minute=10 \
  --data config.hour=100
```

## Admin API Endpoints

Kong Admin API is available at **http://localhost:8001**:

- **Services**: `GET /services`
- **Routes**: `GET /routes`
- **Plugins**: `GET /plugins`
- **Consumers**: `GET /consumers`
- **Health**: `GET /status`

## Kong Manager (GUI)

Web-based management interface available at **http://localhost:8002**

## Configuration Files

- **`docker-compose.yml`**: Kong infrastructure setup
- **`kong.yml`**: Declarative service/route configuration
- **`README.md`**: This documentation

## Environment Variables

Kong configuration via environment variables:

```yaml
KONG_DATABASE: postgres
KONG_PG_HOST: kong-database
KONG_PG_PORT: 5432
KONG_PG_USER: kong
KONG_PG_PASSWORD: kong_password
KONG_PROXY_LISTEN: 0.0.0.0:8000
KONG_ADMIN_LISTEN: 0.0.0.0:8001
```

## Networking

Kong connects to microservices via Docker network **`tempsdarret_microservices`**.

Ensure all microservices are on this network:

```yaml
# In microservice docker-compose.yml
networks:
  - tempsdarret_microservices

networks:
  tempsdarret_microservices:
    external: true
```

## Monitoring

### Check Kong Logs

```bash
docker-compose logs -f kong
```

### Check Service Health

```bash
# Kong health
curl http://localhost:8001/status

# Service status
curl http://localhost:8001/services/{service-name}/health
```

### Metrics

Kong provides built-in metrics at:
- Prometheus: Available via plugin
- StatsD: Available via plugin

## Authentication

Kong supports multiple authentication methods:

- **JWT**: JSON Web Tokens
- **Key Auth**: API keys
- **OAuth 2.0**: Full OAuth flow
- **Basic Auth**: Username/password

Example JWT setup:

```bash
# Enable JWT plugin
curl -X POST http://localhost:8001/services/user-service/plugins \
  --data name=jwt

# Create consumer
curl -X POST http://localhost:8001/consumers \
  --data username=photographer

# Add JWT credentials
curl -X POST http://localhost:8001/consumers/photographer/jwt \
  --data key=photographer_key \
  --data secret=photographer_secret
```

## Production Considerations

For production deployments:

1. **Use HTTPS**: Configure SSL certificates
2. **Database**: Use managed PostgreSQL (not Docker)
3. **Clustering**: Run multiple Kong instances for HA
4. **Secrets**: Use environment variables or vault for credentials
5. **Monitoring**: Enable Prometheus/Grafana monitoring
6. **Logging**: Configure centralized logging (ELK, Datadog)

## Troubleshooting

### Kong won't start

```bash
# Check database connection
docker-compose logs kong-database

# Run migrations manually
docker-compose run --rm kong-migration
```

### Service not accessible

```bash
# Verify service is registered
curl http://localhost:8001/services

# Check route configuration
curl http://localhost:8001/routes

# Test upstream directly
curl http://user-service:3002/api/v1/users
```

### Rate limiting issues

```bash
# Check rate limit configuration
curl http://localhost:8001/plugins | jq '.data[] | select(.name=="rate-limiting")'

# Clear rate limits (restart Kong)
docker-compose restart kong
```

## References

- [Kong Documentation](https://docs.konghq.com/)
- [Kong Admin API](https://docs.konghq.com/gateway/latest/admin-api/)
- [Kong Plugins](https://docs.konghq.com/hub/)
- [Kong Docker](https://hub.docker.com/_/kong)
