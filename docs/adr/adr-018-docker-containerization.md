# ADR-018: Docker Containerization for All Services

## Status

Accepted

## Date

2025-08-09

## Context

Our photography platform consists of multiple microservices, frontend applications, and infrastructure components that need to be deployed consistently across development, staging, and production environments. Manual deployment and environment-specific configuration leads to "works on my machine" issues and deployment inconsistencies.

### Deployment Requirements
- **Consistent environments** across development, staging, and production
- **Scalable deployment** for photography file processing workloads
- **Resource isolation** between services handling sensitive client data
- **Simplified CI/CD** with standardized deployment artifacts
- **Development environment parity** with production systems

### Current Challenges
- Environment drift between development and production
- Complex setup procedures for new team members
- Inconsistent dependency versions across environments
- Resource contention between services on shared infrastructure
- Difficult rollbacks and version management

## Decision

We will **containerize all services** using Docker with multi-stage builds optimized for our TypeScript stack, implementing container-first development workflows and production deployment strategies.

## Rationale

### Photography-Specific Container Requirements

Photography platforms have unique containerization needs:

**Large File Processing:**
```dockerfile
# Optimized for image processing workloads
FROM node:20-alpine AS base
RUN apk add --no-cache \
  imagemagick \
  libvips-dev \
  ffmpeg \
  exiftool
  
# Increased memory limits for RAW processing
ENV NODE_OPTIONS="--max-old-space-size=4096"
```

**Security for Client Data:**
```dockerfile
# Non-root user for security
RUN addgroup -g 1001 -S photography && \
    adduser -S photography -u 1001 -G photography

# Secure file permissions
COPY --chown=photography:photography . .
USER photography

# Read-only filesystem where possible
VOLUME ["/app/uploads", "/app/processed"]
```

**Multi-stage Build Optimization:**
```dockerfile
# Multi-stage build for production efficiency
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS builder
WORKDIR /app  
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Service-Specific Container Configurations

**Shoot Service Container:**
```dockerfile
# services/shoot-service/Dockerfile
FROM node:20-alpine AS base

# Install system dependencies for image metadata
RUN apk add --no-cache \
  imagemagick \
  exiftool \
  libvips-dev

WORKDIR /app

# Dependencies layer (cached)
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# Build layer
FROM base AS builder  
COPY . .
RUN npm ci && npm run build

# Runtime layer
FROM base AS runner
RUN addgroup -g 1001 -S shootapp && \
    adduser -S shootapp -u 1001 -G shootapp

COPY --from=deps --chown=shootapp:shootapp /app/node_modules ./node_modules
COPY --from=builder --chown=shootapp:shootapp /app/dist ./dist
COPY --chown=shootapp:shootapp package*.json ./

USER shootapp
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

**File Processing Service Container:**
```dockerfile
# services/file-service/Dockerfile
FROM node:20-alpine AS base

# Heavy image processing dependencies
RUN apk add --no-cache \
  imagemagick \
  libvips-dev \
  ffmpeg \
  gifsicle \
  optipng \
  libjpeg-turbo-utils

# Increase memory for RAW file processing
ENV NODE_OPTIONS="--max-old-space-size=8192"

# Create processing directories
RUN mkdir -p /app/temp /app/processed && \
    chmod 755 /app/temp /app/processed

WORKDIR /app

# Multi-stage build (same pattern as shoot-service)
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
COPY . .
RUN npm ci && npm run build

FROM base AS runner
RUN addgroup -g 1001 -S fileapp && \
    adduser -S fileapp -u 1001 -G fileapp

# Create writable volumes for file processing
VOLUME ["/app/temp", "/app/processed"]

COPY --from=deps --chown=fileapp:fileapp /app/node_modules ./node_modules
COPY --from=builder --chown=fileapp:fileapp /app/dist ./dist
COPY --chown=fileapp:fileapp package*.json ./

USER fileapp
EXPOSE 3000

# Extended timeout for file processing
HEALTHCHECK --interval=60s --timeout=30s --start-period=10s --retries=2 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

**Frontend Container (SvelteKit):**
```dockerfile
# packages/frontend/Dockerfile
FROM node:20-alpine AS base
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Build with photography-optimized settings
ENV NODE_ENV=production
ENV VITE_PHOTOGRAPHY_CDN_URL=https://cdn.tempsdarret.studio
RUN npm run build

# Runner  
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S svelteapp && \
    adduser -S svelteapp -u 1001 -G svelteapp

COPY --from=builder --chown=svelteapp:svelteapp /app/build ./build
COPY --from=builder --chown=svelteapp:svelteapp /app/package*.json ./
COPY --from=deps --chown=svelteapp:svelteapp /app/node_modules ./node_modules

USER svelteapp
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "build"]
```

## Container Orchestration with Docker Compose

### Development Environment

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  # Infrastructure services
  mongodb:
    image: mongo:7.0
    container_name: tempsdarret-mongo-dev
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: dev_password
    volumes:
      - mongodb_data:/data/db
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    container_name: tempsdarret-kafka-dev
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    container_name: tempsdarret-zookeeper-dev
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  # Microservices
  shoot-service:
    build:
      context: ./services/shoot-service
      target: runner
    container_name: shoot-service-dev
    ports:
      - "3001:3000"
    environment:
      NODE_ENV: development
      MONGODB_URI: mongodb://admin:dev_password@mongodb:27017/shoots?authSource=admin
      KAFKA_BROKERS: kafka:9092
    depends_on:
      - mongodb
      - kafka
    volumes:
      - ./services/shoot-service:/app
      - /app/node_modules
    command: npm run dev

  file-service:
    build:
      context: ./services/file-service
      target: runner
    container_name: file-service-dev
    ports:
      - "3002:3000"
    environment:
      NODE_ENV: development
      MONGODB_URI: mongodb://admin:dev_password@mongodb:27017/files?authSource=admin
      KAFKA_BROKERS: kafka:9092
      TEMP_DIR: /app/temp
      PROCESSED_DIR: /app/processed
    depends_on:
      - mongodb
      - kafka
    volumes:
      - ./services/file-service:/app
      - /app/node_modules
      - file_temp:/app/temp
      - file_processed:/app/processed

  # Frontend
  frontend:
    build:
      context: ./packages/frontend
      target: runner
    container_name: frontend-dev
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      VITE_SHOOT_SERVICE_URL: http://localhost:3001
      VITE_FILE_SERVICE_URL: http://localhost:3002
    volumes:
      - ./packages/frontend:/app
      - /app/node_modules
    command: npm run dev

volumes:
  mongodb_data:
  file_temp:
  file_processed:
```

### Production Environment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  shoot-service:
    image: tempsdarret/shoot-service:${VERSION}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    environment:
      NODE_ENV: production
      MONGODB_URI: ${MONGODB_URI}
      KAFKA_BROKERS: ${KAFKA_BROKERS}
    secrets:
      - mongodb_credentials
      - kafka_credentials
    networks:
      - tempsdarret_network

  file-service:
    image: tempsdarret/file-service:${VERSION}
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
    environment:
      NODE_ENV: production
      MONGODB_URI: ${MONGODB_URI}
      KAFKA_BROKERS: ${KAFKA_BROKERS}
    volumes:
      - type: volume
        source: file_storage
        target: /app/processed
        read_only: false
    networks:
      - tempsdarret_network

networks:
  tempsdarret_network:
    external: true

secrets:
  mongodb_credentials:
    external: true
  kafka_credentials:
    external: true

volumes:
  file_storage:
    external: true
```

## Development Workflow Integration

### Container-First Development

```bash
# scripts/dev-setup.sh
#!/bin/bash

echo "🐋 Setting up Temps D'arrêt development environment..."

# Build all development containers
docker compose -f docker-compose.dev.yml build

# Start infrastructure services first
docker compose -f docker-compose.dev.yml up -d mongodb kafka

# Wait for services to be ready
echo "⏳ Waiting for infrastructure services..."
sleep 30

# Start application services
docker compose -f docker-compose.dev.yml up -d

echo "✅ Development environment ready!"
echo "📸 Shoot Service: http://localhost:3001"
echo "📁 File Service: http://localhost:3002" 
echo "🌐 Frontend: http://localhost:3000"
echo "🗄️ MongoDB: mongodb://localhost:27017"
echo "📨 Kafka: localhost:9092"
```

### Hot Reload Development

```dockerfile
# Development Dockerfile with hot reload
FROM node:20-alpine AS development

RUN apk add --no-cache imagemagick exiftool libvips-dev

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Development command with hot reload
CMD ["npm", "run", "dev"]
```

### Testing in Containers

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  test-mongodb:
    image: mongo:7.0
    tmpfs:
      - /data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: test
      MONGO_INITDB_ROOT_PASSWORD: test

  test-kafka:
    image: confluentinc/cp-kafka:7.4.0
    depends_on:
      - test-zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: test-zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://test-kafka:9092

  test-zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  # Test runners
  shoot-service-test:
    build:
      context: ./services/shoot-service
      target: development
    environment:
      NODE_ENV: test
      MONGODB_URI: mongodb://test:test@test-mongodb:27017/shoots_test?authSource=admin
      KAFKA_BROKERS: test-kafka:9092
    depends_on:
      - test-mongodb
      - test-kafka
    command: npm test
    volumes:
      - ./services/shoot-service:/app
      - /app/node_modules
```

## CI/CD Pipeline Integration

### Build Pipeline

```yaml
# .github/workflows/docker-build.yml
name: Docker Build & Push

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-services:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [shoot-service, file-service, invite-service]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}/${{ matrix.service }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=sha
            
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./services/${{ matrix.service }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          
      - name: Test container
        run: |
          docker run --rm \
            --name test-${{ matrix.service }} \
            ghcr.io/${{ github.repository }}/${{ matrix.service }}:${{ github.sha }} \
            npm test
```

### Security Scanning

```yaml
# Container security scanning
  security-scan:
    needs: build-services
    runs-on: ubuntu-latest
    steps:
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/${{ github.repository }}/shoot-service:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

## Production Deployment Strategy

### Kubernetes Deployment

```yaml
# k8s/shoot-service/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shoot-service
  labels:
    app: shoot-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shoot-service
      version: v1
  template:
    metadata:
      labels:
        app: shoot-service
        version: v1
    spec:
      containers:
      - name: shoot-service
        image: ghcr.io/tempsdarret/shoot-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: uri
        resources:
          limits:
            cpu: 1000m
            memory: 512Mi
          requests:
            cpu: 500m
            memory: 256Mi
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Resource Optimization

```yaml
# File processing service with higher resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: file-service
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: file-service
        image: ghcr.io/tempsdarret/file-service:latest
        resources:
          limits:
            cpu: 2000m
            memory: 2Gi
            ephemeral-storage: 10Gi
          requests:
            cpu: 1000m
            memory: 1Gi
            ephemeral-storage: 5Gi
        volumeMounts:
        - name: temp-storage
          mountPath: /app/temp
        - name: processed-storage  
          mountPath: /app/processed
      volumes:
      - name: temp-storage
        emptyDir:
          sizeLimit: 10Gi
      - name: processed-storage
        persistentVolumeClaim:
          claimName: file-processed-pvc
```

## Container Monitoring and Logging

### Health Check Implementation

```typescript
// src/health/container-health.ts
import { FastifyReply, FastifyRequest } from 'fastify';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: boolean;
    kafka: boolean;
    filesystem: boolean;
    memory: boolean;
  };
}

export async function livenessProbе(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Basic liveness check - is the process running?
  reply.send({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}

export async function readinessProbe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkKafka(),
    checkFilesystem(),
    checkMemory()
  ]);

  const isReady = checks.every(
    check => check.status === 'fulfilled' && check.value === true
  );

  const healthCheck: HealthCheck = {
    status: isReady ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.VERSION || 'unknown',
    checks: {
      database: checks[0].status === 'fulfilled' && checks[0].value,
      kafka: checks[1].status === 'fulfilled' && checks[1].value,
      filesystem: checks[2].status === 'fulfilled' && checks[2].value,
      memory: checks[3].status === 'fulfilled' && checks[3].value
    }
  };

  reply.code(isReady ? 200 : 503).send(healthCheck);
}
```

### Container Logging

```dockerfile
# Structured logging configuration
ENV LOG_LEVEL=info
ENV LOG_FORMAT=json
ENV LOG_DESTINATION=stdout

# Install logging utilities
RUN npm install --production pino pino-pretty
```

## Trade-offs

### Accepted Trade-offs
- **Increased complexity** in development environment setup
- **Resource overhead** from containerization layer
- **Build time increase** from multi-stage container builds

### Benefits Gained
- **Environment consistency** eliminating deployment issues
- **Scalable architecture** supporting photography workload growth
- **Security isolation** protecting client data between services
- **Simplified CI/CD** with standardized deployment artifacts

## Consequences

### Positive
- Consistent development and production environments
- Simplified deployment and scaling of photography services
- Improved security through container isolation
- Faster onboarding with standardized development setup

### Negative
- Additional learning curve for containerization concepts
- Increased resource usage from container overhead
- More complex debugging across container boundaries

### Neutral
- Development workflow changes to container-first approach
- Infrastructure monitoring requires container-aware tools
- Team training needed for Docker and container orchestration

## Compliance

This decision will be enforced through:
- **Mandatory containerization** for all new services
- **CI/CD pipeline** requiring successful container builds
- **Development environment** standardized on Docker Compose
- **Security scanning** integrated into container build process