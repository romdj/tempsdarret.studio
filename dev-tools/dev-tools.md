# Development Tools

## Overview
Collection of utilities and scripts to streamline development, testing, and maintenance of the photography portfolio platform.

## Core Responsibilities
- **Development utilities**: Scripts for common development tasks
- **Testing helpers**: Mock data generation and API testing
- **Debugging tools**: Service communication and event flow tracing
- **Deployment automation**: Local and production deployment scripts

## Technology Stack
- **Runtime**: Node.js with TypeScript
- **Scripting**: Bash for system operations
- **Testing**: Jest, Supertest for API testing
- **Monitoring**: Custom service health utilities

## Key Tools

### **Development Workflow**
```bash
# Project setup and service management
./scripts/setup-dev.sh          # Initialize entire development environment
./scripts/service.sh start file-service    # Start individual service
./scripts/stack.sh start         # Start all services
./scripts/db.sh seed            # Load sample data
```

### **Mock Data Generation**
```typescript
// Generate realistic test data for all services
interface MockDataConfig {
  projects: { weddings: 5, portraits: 3, corporate: 2 };
  imagesPerProject: 15-25;
  clientsWithAccess: 60%;
}

// Creates complete projects, users, invites, and test images
generateMockPortfolio(): Promise<MockData>
```

### **Debugging Utilities**
```typescript
// Event flow tracing across services
EventFlowTracer.traceEventFlow(correlationId): Promise<EventFlow[]>

// Service health monitoring
ServiceHealthMonitor.checkAllServices(): Promise<ServiceHealth[]>

// Integration testing
WorkflowTester.testClientProjectFlow(): Promise<TestResult>
```

### **File System Setup**
```typescript
// Generate test images in proper directory structure
generateTestImages(): Promise<void>
// Creates: /projects/{projectId}/{mediaId}/{original|high|medium|thumb}/
```

## Tool Structure
```
dev-tools/
├── scripts/           # Bash scripts for common operations
├── src/
│   ├── mock-data/     # Test data generation
│   ├── testing/       # API testing utilities  
│   ├── debugging/     # Debug and monitoring tools
│   └── deployment/    # Deployment helpers
└── config/           # Environment configurations
```

## Implementation Phases

### Phase 1: Essential Tools
- [ ] Project setup and service management scripts
- [ ] Mock data generation for all services
- [ ] Basic health checking and monitoring
- [ ] Database seeding and reset utilities

### Phase 2: Testing & Debugging
- [ ] Integration testing suite
- [ ] Event flow tracing tools
- [ ] Load testing utilities
- [ ] Performance profiling helpers

### Phase 3: Operations
- [ ] Deployment automation
- [ ] Backup and recovery scripts
- [ ] Security scanning tools
- [ ] Business metrics dashboards

## Benefits
- **Fast onboarding**: Complete environment setup in minutes
- **Reliable testing**: Consistent mock data and automated tests
- **Easy debugging**: Clear service interaction visibility
- **Operational confidence**: Automated deployment and monitoring