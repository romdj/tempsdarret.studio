[![Build Temps d'Arrêt Project](https://github.com/romdj/tempsdarret.studio/actions/workflows/build.yaml/badge.svg?branch=main)](https://github.com/romdj/tempsdarret.studio/actions/workflows/build.yaml)

# Temps D'arrêt Studio - Photography Platform

A modern photography portfolio website with client portal functionality built with event-driven microservices architecture, designed for professional photographers managing large photo collections and client workflows.

## 📖 Architecture Documentation

### Core Documentation
- **[ARC42 Solution Architecture Document](docs/architecture/arc42-sad.md)** - Comprehensive architecture following ARC42 standards
- **[ARC42 Gap Assessment](docs/architecture/arc42-gap-assessment.md)** - Analysis of ARC42 compliance and improvement roadmap
- **[Original Solution Architecture Document](docs/architecture/sad.md)** - Initial comprehensive architecture documentation

### Architectural Views
- **[Business Architecture View](docs/diagrams/01-business-view.mmd)** - Stakeholders, capabilities, and value streams
- **[Application Cooperation View](docs/diagrams/Archimate/02-application-cooperation-view.mmd)** - Service interactions and cooperation patterns
- **[Application Realization View](docs/diagrams/03-application-realization.mmd)** - Technology implementation mapping
- **[Sequence Diagrams](docs/diagrams/Sequence%20diagrams/)** - Detailed workflow documentation

### Additional Documentation
- **[Functional Scenarios](docs/Functional-scenarios.md)** - Detailed user workflows and requirements
- **[Implementation Roadmap](implementation_roadmap.md)** - Step-by-step delivery plan
- **[Backend Architecture](backend_roadmap.md)** - Event-driven microservices design

## 🏗️ System Overview

This platform provides a complete photography business solution:

### For Photographers
- **Portfolio Management**: Professional showcase with SEO optimization for client acquisition
- **Shoot Management**: Complete photography session lifecycle with automated workflows
- **Client Communication**: Automated invitation and notification system via magic links
- **File Processing**: Handle 25MB+ RAW files with multi-resolution processing

### For Clients  
- **Secure Gallery Access**: Passwordless authentication via magic links with role-based permissions
- **Photo Downloads**: Access to all resolutions including RAW files and complete archives (50-300GB)
- **Guest Sharing**: Invite family/friends with limited access to print-quality downloads
- **Mobile Experience**: Responsive design optimized for mobile photo viewing

### For System Administrators
- **Self-Hosted Infrastructure**: Complete data sovereignty with cost-effective deployment
- **Event-Driven Architecture**: Scalable microservices with Kafka message coordination
- **Monitoring & Operations**: Health checks, automated backups, and performance monitoring

## 🛠️ Technology Stack

### Frontend Layer
- **Framework**: SvelteKit v2.26.0 with TypeScript v5.8.3
- **Styling**: TailwindCSS + DaisyUI v4.12.0 for responsive design
- **Build**: Vite v7.0.6 with hot reload and optimization
- **Testing**: Vitest v3.2.4 with coverage reporting

### Backend Services
- **Runtime**: Node.js 24+ with Fastify v5.4.0 (high-performance HTTP server)
- **Language**: TypeScript v5.8.3 with strict mode for type safety
- **Architecture**: Event-driven microservices with domain separation
- **API Design**: Schema-first development using TypeSpec v1.2.1

### Data & Integration
- **Database**: MongoDB with Mongoose v8.16.4 for flexible document storage
- **Event Bus**: Apache Kafka for asynchronous service coordination
- **File Processing**: Sharp v0.34.3 for multi-resolution image processing
- **Authentication**: Magic links with JWT tokens and role-based access control

### Infrastructure & Operations
- **Containerization**: Docker with Docker Compose for consistent deployment
- **Reverse Proxy**: Nginx with SSL termination and request routing
- **SSL Management**: Let's Encrypt with automatic certificate renewal
- **Monitoring**: Custom health checks with structured logging

## 🚀 Quick Start

For detailed setup instructions including cross-platform support (Linux, macOS, Windows) and Docker-based development, see **[📋 Local Development Guide](run_locally.md)**.

### Prerequisites
- **Node.js 24+** and **npm 10+** (check with `node --version`)
- **Docker & Docker Compose** (recommended for easy setup)
- **Git** for version control

### Quick Setup with Docker (Recommended)
```bash
# Clone and setup
git clone <repository-url>
cd tempsdarret-studio
cp .env.example .env

# Start all services
docker-compose up -d

# Access the platform
open http://localhost:5173  # Frontend
open http://localhost:3001  # Admin UI
```

### Manual Development Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd tempsdarret-studio
   npm run install:all
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Configure your MongoDB URL, SMTP settings, and other environment variables
   ```

3. **Start Development Environment**
   ```bash
   npm run dev
   ```
   
   **Access Points:**
   - 🌐 **Frontend**: http://localhost:5173 (SvelteKit app)
   - 🔌 **API Gateway**: http://localhost:3001 (REST API)
   - 🔧 **Services**: http://localhost:3002-3007 (Individual microservices)

### Testing

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run specific service tests
npm run test:shoot-service
```

### Production Deployment

1. **Build All Services**
   ```bash
   npm run build
   ```

2. **Docker Deployment**
   ```bash
   npm run docker:up:build
   ```

3. **Health Check**
   ```bash
   curl http://localhost/api/health
   ```

## 📁 Project Structure

```
tempsdarret-studio/
├── 📱 frontend/                    # SvelteKit client application
│   ├── src/routes/                 # Page components and routing
│   ├── src/lib/                    # Shared components and utilities
│   └── static/                     # Static assets
├── 🌐 api-gateway/                 # Request routing and authentication proxy
├── 🔧 services/                    # Event-driven microservices
│   ├── user-service/               # User lifecycle & magic link auth
│   ├── invite-service/             # Invitation workflow management
│   ├── shoot-service/              # Photography session business logic
│   ├── file-service/               # Large file processing & archives
│   ├── portfolio-service/          # Public content & SEO management
│   └── notification-service/       # Email delivery & communication
├── 📦 packages/                    # Shared libraries and schemas
│   ├── shared/                     # Common utilities and configurations
│   ├── models/                     # TypeSpec API schema definitions
│   ├── types/                      # Generated TypeScript type definitions
│   └── events/                     # Event schema specifications
├── 🏗️ infrastructure/              # Deployment and operations
│   ├── docker/                     # Container configurations
│   ├── nginx/                      # Reverse proxy settings
│   └── monitoring/                 # Health checks and observability
└── 📚 docs/                        # Architecture and API documentation
    ├── architecture/               # Solution architecture documents
    ├── diagrams/                   # Architectural views and sequences
    └── api/                        # Generated OpenAPI documentation
```

## 🔄 Development Workflow

### Monorepo Management
This project uses **npm workspaces** for coordinated development across all services:

```bash
# Install dependencies for all workspaces
npm run install:all

# Build all packages and services in dependency order
npm run build

# Run linting and formatting across all workspaces  
npm run lint

# Type checking for all TypeScript code
npm run check

# Clean all build artifacts and node_modules
npm run clean

# Reset entire project (clean + install + build)
npm run reset
```

### Testing Strategy
Following **Test-Driven Development (TDD)** principles:

- **🔬 Unit Tests**: Individual service components and business logic
- **🔗 Integration Tests**: Service-to-service event communication
- **🎭 End-to-End Tests**: Complete user workflows and scenarios
- **⚛️ Component Tests**: Frontend component behavior and integration

```bash
# TDD workflow commands
npm run test:watch              # Continuous testing during development
npm run test:coverage           # Coverage reports for quality gates
npm run test:integration        # Service integration validation
```

### Schema-First Development
Ensuring API consistency across all services:

1. **Define Schemas**: Update TypeSpec models in `packages/models/`
2. **Generate Types**: `npm run build:models` creates TypeScript definitions
3. **Implement Services**: Use generated types for type-safe development
4. **Update Documentation**: `npm run docs:generate` creates API docs

### Event-Driven Development
Building resilient microservices workflows:

1. **Design Events**: Define event schemas in `packages/events/`
2. **Implement Publishers**: Services publish domain events via Kafka
3. **Create Consumers**: Services react to relevant business events
4. **Test Workflows**: Validate complete event flows in integration tests

## ✨ Key Architecture Features

### 🔐 Authentication & Security
- **Passwordless Magic Links**: Email-based authentication with 15-minute expiry
- **Role-Based Access Control**: Fine-grained permissions (Photographer/Client/Guest)
- **JWT Session Management**: Stateless authentication with secure token handling
- **Secure File Access**: Signed URLs with role-based download restrictions

### 📁 Advanced File Management
- **Large File Processing**: Stream handling of 25MB+ RAW photography files
- **Multi-Resolution Pipeline**: Automatic generation of 4 image variants (thumb/medium/high/original)
- **Archive Generation**: On-demand creation of 50-300GB ZIP collections
- **Progress Tracking**: Real-time upload/processing status with WebSocket updates

### ⚡ Event-Driven Architecture
- **Microservices Coordination**: Kafka message bus for loose service coupling
- **Asynchronous Processing**: Non-blocking workflows for file processing and notifications
- **Event Sourcing**: Complete business operation audit trail with event replay
- **Resilience Patterns**: Dead letter queues, circuit breakers, and retry mechanisms

### 🏠 Self-Hosted Infrastructure
- **Cost Optimization**: Eliminate recurring cloud storage fees for large photo collections
- **Data Sovereignty**: Complete control over client files and privacy compliance
- **Performance Benefits**: Local file serving without bandwidth limitations
- **Privacy First**: Client data and photos never leave your infrastructure

## 📊 Monitoring & Operations

### Health Monitoring
```bash
# Check service health
curl http://localhost:3001/api/health

# Monitor file processing
npm run monitor:files

# View system metrics
npm run monitor:system
```

### Backup & Recovery
```bash
# Create database backup
npm run backup:create

# Restore from backup
npm run backup:restore <backup-date>

# Verify backup integrity
npm run backup:verify
```

## 🤝 Contributing

We follow trunk-based development with short-lived feature branches:

1. **Create Feature Branch**: `git checkout -b feature/short-description`
2. **Follow TDD**: Write tests first, implement features
3. **Commit Standards**: Use conventional commits for clear history
4. **Quality Gates**: All tests pass, linting clean, type checking successful
5. **Pull Request**: Create PR with architectural impact assessment

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for detailed development guidelines.

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support & Documentation

- **🏗️ Architecture Questions**: See [ARC42 Documentation](docs/architecture/arc42-sad.md)
- **🔧 Development Issues**: Check [Development Guide](docs/DEVELOPMENT.md)
- **🚀 Deployment Help**: Review [Infrastructure Guide](infrastructure/README.md)
- **📚 API References**: Browse [Generated API Docs](docs/api/index.html)

## Roadmaps & Legacy Documentation

- [Implementation Roadmap](./implementation_roadmap.md)
- [Backend Microservices](./backend_roadmap.md)
- [MongoDB Data Model](./mongodb_roadmap.md)
- [Best Practices](./BEST_PRACTICES.md)