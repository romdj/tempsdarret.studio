# API Gateway (Backend for Frontend)

## Overview
Unified entry point for all frontend communications. Aggregates and orchestrates calls to microservices, handles authentication, and provides a clean, consistent API for the SvelteKit frontend.

## Core Responsibilities
- **API aggregation**: Single endpoint for multiple microservice calls
- **Authentication gateway**: Validate JWT tokens and magic links
- **Request routing**: Direct requests to appropriate microservices
- **Response composition**: Combine data from multiple services
- **Rate limiting**: Protect backend services from abuse
- **Error handling**: Consistent error responses across all services

## Why API Gateway for Photography Platform

### **Frontend Simplicity**
```typescript
// Without API Gateway (complex for frontend)
const user = await userService.getUser(token);
const project = await eventService.getProject(projectId);
const images = await fileService.getProjectImages(projectId);
const invites = await inviteService.getProjectInvites(projectId);

// With API Gateway (single call)
const projectView = await api.getProjectView(projectId, token);
```

### **Cross-Service Coordination**
```typescript
// Creating a new project requires multiple services
POST /api/projects → {
  1. Create project in Event Service
  2. Generate invite in Invite Service  
  3. Send notification via Notification Service
  4. Return unified response to frontend
}
```

## Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with middleware pipeline
- **Proxy**: http-proxy-middleware for service routing
- **Authentication**: JWT validation and magic link processing
- **Caching**: Redis for response caching
- **Rate limiting**: express-rate-limit for protection

## API Endpoints Design

### **Authentication & Sessions**
- `POST /api/auth/magic-link` - Generate magic link for project access
- `GET /api/auth/validate/{token}` - Validate magic link and return JWT
- `POST /api/auth/refresh` - Refresh JWT token
- `DELETE /api/auth/logout` - Invalidate session

### **Project Views (Aggregated)**
- `GET /api/projects/{id}/view` - Complete project view with images, client info
- `GET /api/projects/{ref}/client-view` - Client-specific project view via reference
- `GET /api/projects` - List projects with metadata and stats
- `POST /api/projects` - Create project with automatic invite generation

### **Portfolio Views (Public)**
- `GET /api/portfolio` - Featured portfolio content with optimized images
- `GET /api/portfolio/category/{category}` - Category-specific portfolio
- `GET /api/services` - Professional services with portfolio samples

### **File Operations (Proxied)**
- `POST /api/files/upload/{projectId}` - Upload files with progress tracking
- `GET /api/files/{projectId}/{mediaId}/{resolution}` - Serve files with auth
- `POST /api/files/{projectId}/{mediaId}/download` - Secure download with logging

### **Admin Operations (Protected)**
- `GET /api/admin/dashboard` - Admin overview with cross-service stats
- `POST /api/admin/projects/{id}/publish` - Publish project across services
- `GET /api/admin/analytics` - Business metrics from multiple services

## Request Aggregation Examples

### **Client Project View**
```typescript
// Single endpoint that coordinates multiple services
GET /api/projects/wedding-2024-smith/client-view
Authorization: Bearer {magic-link-jwt}

// Gateway orchestrates:
async function getClientProjectView(projectRef: string, clientToken: JWT): Promise<ClientProjectView> {
  // 1. Validate client access (User Service)
  const access = await userService.validateProjectAccess(clientToken, projectRef);
  if (!access.allowed) throw new UnauthorizedError();
  
  // 2. Get project details (Event Service)  
  const project = await eventService.getProjectByRef(projectRef);
  
  // 3. Get project images with permissions (File Service)
  const images = await fileService.getProjectImages(project.id, {
    resolution: ['thumb', 'medium', 'high'],
    includeDownloadUrls: access.canDownload
  });
  
  // 4. Get download history (Analytics)
  const downloadHistory = await analyticsService.getClientDownloads(clientToken.email, project.id);
  
  // 5. Compose unified response
  return {
    project: {
      title: project.title,
      description: project.description,
      date: project.event.date,
      location: project.event.location
    },
    gallery: {
      images: images.map(img => ({
        id: img.id,
        urls: img.urls,
        caption: img.display.caption,
        canDownload: access.canDownload
      })),
      totalCount: images.length
    },
    client: {
      downloadHistory,
      accessExpiresAt: access.expiresAt,
      canDownload: access.canDownload
    }
  };
}
```

### **Admin Dashboard View**
```typescript
// Aggregate statistics from all services
GET /api/admin/dashboard
Authorization: Bearer {admin-jwt}

async function getAdminDashboard(): Promise<AdminDashboard> {
  // Parallel requests to all services
  const [projects, files, users, notifications] = await Promise.all([
    eventService.getProjectStats(),
    fileService.getStorageStats(), 
    userService.getUserStats(),
    notificationService.getDeliveryStats()
  ]);
  
  return {
    overview: {
      totalProjects: projects.total,
      activeProjects: projects.active,
      totalStorage: files.totalSize,
      totalClients: users.clients,
      emailsSentThisMonth: notifications.sentThisMonth
    },
    recentActivity: await getRecentActivity(),
    alerts: await getSystemAlerts()
  };
}
```

## Service Routing Configuration

### **Route Mapping**
```typescript
const serviceRoutes = {
  // Direct proxy routes (no aggregation needed)
  '/api/auth/*': 'http://user-service:3001',
  '/api/files/serve/*': 'http://file-service:3003',
  '/api/notifications/*': 'http://notification-service:3005',
  
  // Aggregated routes (handled by gateway)
  '/api/projects/*/view': 'gateway-aggregation',
  '/api/portfolio/*': 'gateway-aggregation', 
  '/api/admin/*': 'gateway-aggregation'
};
```

### **Middleware Pipeline**
```typescript
app.use('/api', [
  rateLimiter,           // Rate limiting per IP/user
  authMiddleware,        // JWT validation for protected routes
  corsMiddleware,        // CORS handling
  requestLogger,         // Request/response logging
  serviceRouter,         // Route to services or aggregation
  errorHandler          // Consistent error responses
]);
```

## Authentication Integration

### **Magic Link Validation**
```typescript
// Validate magic link and issue JWT for client access
POST /api/auth/magic-link/validate
{
  "token": "magic-link-token-from-email"
}

// Gateway coordinates:
async function validateMagicLink(token: string): Promise<AuthResponse> {
  // 1. Validate token with Invite Service
  const invite = await inviteService.validateToken(token);
  if (!invite.valid) throw new InvalidTokenError();
  
  // 2. Get or create user (User Service)
  const user = await userService.getOrCreateUser(invite.email);
  
  // 3. Grant project access (Event Service)
  await eventService.grantProjectAccess(user.id, invite.projectId);
  
  // 4. Issue JWT for session
  const jwt = await userService.issueJWT(user, { projectId: invite.projectId });
  
  // 5. Log access (Analytics)
  await analyticsService.logProjectAccess(user.id, invite.projectId, 'magic-link');
  
  return {
    token: jwt,
    user: user,
    projectAccess: { projectId: invite.projectId, expiresAt: invite.expiresAt }
  };
}
```

## Error Handling & Resilience

### **Circuit Breaker Pattern**
```typescript
// Protect against cascading failures
const circuitBreaker = new CircuitBreaker(serviceCall, {
  timeout: 3000,        // 3 second timeout
  errorThresholdPercentage: 50,  // Open circuit at 50% failure rate
  resetTimeout: 30000   // Try again after 30 seconds
});

// Graceful degradation
async function getProjectWithFallback(projectId: string): Promise<ProjectView> {
  try {
    return await circuitBreaker.fire(projectId);
  } catch (error) {
    // Return cached or minimal data if service is down
    return await getCachedProject(projectId) || getMinimalProject(projectId);
  }
}
```

### **Timeout & Retry Logic**
```typescript
// Prevent slow services from blocking the gateway
const serviceConfig = {
  timeout: 5000,          // 5 second max per service call
  retries: 2,             // Retry twice on failure
  retryDelay: 1000,       // 1 second between retries
  cacheTTL: 300           // Cache responses for 5 minutes
};
```

## Caching Strategy

### **Multi-Level Caching**
```typescript
interface CacheStrategy {
  // Fast-changing data
  'project-views': '5 minutes';
  'user-sessions': '30 minutes';
  
  // Medium-changing data  
  'portfolio-content': '1 hour';
  'service-pages': '2 hours';
  
  // Slow-changing data
  'public-portfolio': '6 hours';
  'site-metadata': '24 hours';
}
```

## Implementation Phases

### Phase 1: Basic Gateway Setup
- [ ] Set up Express.js gateway with service routing
- [ ] Implement JWT authentication middleware
- [ ] Create basic request/response logging
- [ ] Add rate limiting and security headers
- [ ] Set up health checks for all services

### Phase 2: Request Aggregation
- [ ] Build project view aggregation endpoints
- [ ] Create portfolio content compilation
- [ ] Implement admin dashboard data aggregation
- [ ] Add response caching with Redis
- [ ] Create error handling and fallback logic

### Phase 3: Advanced Features
- [ ] Implement circuit breaker pattern for resilience
- [ ] Add request/response transformation
- [ ] Create API analytics and monitoring
- [ ] Build automated service discovery
- [ ] Add GraphQL layer for flexible queries

## Benefits for Photography Platform
- **Simplified frontend**: Single API surface for all operations
- **Performance**: Reduced round trips and response caching
- **Security**: Centralized authentication and rate limiting
- **Reliability**: Circuit breaker and fallback mechanisms
- **Monitoring**: Centralized logging and analytics
- **Evolution**: Easy to modify service interactions without changing frontend