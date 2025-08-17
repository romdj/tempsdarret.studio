# Temps D'arrêt Studio - Photography Platform Architecture

## Technology Stack (Definitive)

### Frontend
- **Framework:** SvelteKit v2.26.0  
- **Language:** TypeScript v5.8.3  
- **Styling:** TailwindCSS + DaisyUI v4.12.0  
- **Testing:** Vitest v3.2.4 + @vitest/coverage-v8  
- **Build:** Vite v7.0.6  

### Backend Services  
- **Framework:** Fastify v5.4.0 (high-performance, TypeScript-first)  
- **Language:** TypeScript v5.8.3  
- **Runtime:** Node.js 22+  
- **Process Manager:** tsx v4.20.3 (development)  

### API & Schema  
- **Schema Definition:** TypeSpec v1.2.1  
- **API Documentation:** OpenAPI 3.0 (auto-generated)  
- **Event Specifications:** AsyncAPI 3.0  
- **Validation:** Zod v4.0.10  

### Database & Storage  
- **Database:** MongoDB with Mongoose v8.16.4  
- **File Processing:** Sharp v0.34.3  
- **Authentication:** Custom Magic Links (JWT + bcryptjs v3.0.2)  
- **Security:** Helmet, Rate limiting, CORS  

### Development & Build  
- **Package Manager:** npm workspaces (monorepo)  
- **Build System:** Single root tsconfig.json  
- **Testing:** Vitest + component testing  
- **Linting:** ESLint v9.12.0 + Prettier v3.0.0  
- **Git Hooks:** Husky v9.0.0 + Commitlint  

## Service Architecture (Current)

```
packages/
├── models/          # TypeSpec API contracts
├── types/           # Generated TypeScript types  
├── shared/          # Common utilities, configs
└── events/          # AsyncAPI event specifications

services/
├── user-service/           # User management & magic link auth
├── invite-service/         # Magic link generation & invite workflow
├── portfolio-service/      # Public portfolio content management
├── shoot-service/          # Photography shoot lifecycle (NOT event-service)
├── file-service/           # Large file uploads, multi-resolution processing
└── notification-service/   # Email notifications & communication

frontend/            # SvelteKit photography portfolio & client portal
api-gateway/         # Request routing & orchestration
dev-tools/           # Development utilities
infrastructure/      # Docker, K8s, Kafka configurations
```

## Key Architectural Decisions  

### 1. Monorepo Structure  
- **Rationale:** Simplified dependency management, shared TypeScript config
- **Implementation:** npm workspaces with single root tsconfig.json  
- **Benefits:** Type safety across packages, easier refactoring  

### 2. Service Naming  
- **Shoot Service** (not "event-service") for photography domain clarity  
- **Aligned naming:** shoot-service directory matches business terminology  

### 3. Schema-First Development  
- **TypeSpec models** define API contracts  
- **Auto-generation:** OpenAPI docs, TypeScript types, validation schemas  
- **Single source of truth** for all API interfaces  

### 4. Magic Link Authentication  
- **JWT-based** tokens with 15-minute expiry  
- **Stateless** authentication (no session storage)  
- **Email delivery** via configurable SMTP/service providers  

### 5. File Storage Strategy  
```
/uploads/shoots/{shootId}/{resolution}/{filename}
- original: RAW files (25MB+)  
- high: 2048px web-optimized  
- medium: 1024px thumbnails  
- thumb: 320px previews  
```

### 6. Progressive Architecture  
- **V1:** Simplified monolithic backend with microservice structure  
- **V2:** Event-driven microservices with Kafka  
- **V3:** Advanced features (real-time, analytics, etc.)  

## Development Workflow  

### 1. Schema Updates  
```bash
# Update TypeSpec models
packages/models/main.tsp

# Generate documentation  
npm run docs:generate

# Update types if needed
packages/types/src/generated/
```

### 2. Service Development  
```bash
# Work on specific service
cd services/user-service  
npm run dev          # Development server
npm run test         # Run tests  
npm run build        # TypeScript compilation
```

### 3. Full Stack Development  
```bash
npm run dev          # All services + frontend
npm run build        # Full project build
npm run test         # All tests
```

## Security Architecture  

### Authentication Flow  
1. User requests access with email  
2. Magic link generated (JWT token)  
3. Link sent via email (15min expiry)  
4. User clicks → token validated → session created  
5. Subsequent requests use JWT bearer token  

### File Access Control  
- **Signed URLs** with expiration for file downloads  
- **Shoot-based permissions** (users can only access their shoots)  
- **Admin override** for portfolio management  

### Rate Limiting  
- **Magic link requests:** 3 per hour per email  
- **File uploads:** Size limits (25MB per file)  
- **API requests:** Standard rate limiting per service  

## Data Flow Architecture  

### Client Portal Flow  
```
User Request → API Gateway → Service → MongoDB → Response
                    ↓
              Authentication Check
                    ↓  
               Permission Validation
```

### File Upload Flow  
```
Frontend → File Service → Sharp Processing → Storage
    ↓            ↓              ↓              ↓
 Progress    Validation    Multi-resolution   URLs
```

### Magic Link Flow  
```
Email → Invite Service → JWT Generation → Email Service → User
   ↓           ↓               ↓              ↓          ↓
Request     Validation      Token          Delivery   Click → Auth
```

## Performance Targets  

- **Page Load:** < 2s initial load  
- **Image Loading:** Progressive with thumbnails  
- **File Upload:** Progress indication for 25MB+ files  
- **Magic Link:** < 5s email delivery  
- **Gallery:** < 1s navigation between shoots  

## Deployment Architecture  

### Local Development  
```bash
npm run dev  # All services on different ports
# Frontend: http://localhost:5173  
# Services: http://localhost:3001-3006
# MongoDB: localhost:27017
```

### Production (V1)  
- **Single VPS** with Docker containers  
- **MongoDB Atlas** or self-hosted MongoDB  
- **File storage** on server with backup strategy  
- **SSL/TLS** via Let's Encrypt  

### Production (V2)  
- **Kubernetes** cluster for service orchestration  
- **Kafka** for event streaming between services  
- **Object storage** (S3/CloudFlare) for files  
- **CDN** for static assets and image delivery  

---

*This architecture document serves as the single source of truth for all technical decisions and implementations.*