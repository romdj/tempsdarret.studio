# Contributing to Temps D'arrêt Studio

## Overview
Thank you for contributing to the photographer portfolio and client portal platform. This guide helps you understand our monorepo structure and development practices.

## 📋 Quick Start

1. **Fork and clone** the repository
2. **Create a feature branch** from `main`
3. **Use conventional commits** for all changes
4. **Run local validation** before pushing
5. **Create a Pull Request** to `main`

## 🏗️ Project Structure

This is a **monorepo** containing multiple TypeScript packages:

```
tempsdarret.studio/
├── frontend/              # SvelteKit portfolio & client portal
├── services/             # Node.js microservices
│   ├── user-service/     # Authentication & user management
│   ├── invite-service/   # Magic link invitations
│   ├── event-service/    # Project & gallery management
│   ├── file-service/     # Photo storage & processing
│   ├── portfolio-service/# Public portfolio curation
│   └── notification-service/ # Email communications
├── api-gateway/          # Backend for Frontend
├── shared/              # Common types & utilities
├── infrastructure/      # Docker & deployment configs
└── dev-tools/          # Development utilities
```

## 🌳 Branching Strategy

We use a **Feature Branch Workflow** with controlled releases.

### Branch Types

| Branch Type | Purpose | Naming Convention | Example |
|-------------|---------|-------------------|---------|
| `main` | Production-ready code | `main` | `main` |
| Feature | New features or enhancements | `feat/description` | `feat/portfolio-filtering` |
| Bugfix | Bug fixes | `fix/description` | `fix/magic-link-expiration` |
| Hotfix | Critical production fixes | `hotfix/description` | `hotfix/security-patch` |

## 🚀 Development Process

### Prerequisites
- Node.js ≥22.0.0
- npm ≥10.0.0
- Docker (for local development)

### Setup
```bash
# Clone and install
git clone https://github.com/romdj/tempsdarret.studio.git
cd tempsdarret.studio
npm install

# Install all workspace dependencies
npm run install:all

# Build shared package first
cd shared && npm run build && cd ..
```

### Creating a Feature Branch

```bash
# Start from latest main
git checkout main
git pull origin main

# Create and switch to feature branch
git checkout -b feat/client-gallery-improvements
```

### Development with Conventional Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
# Features (minor version bump)
git commit -m "feat(portfolio): add client favorite marking system"
git commit -m "feat(file-service): implement multi-resolution processing"

# Bug fixes (patch version bump)
git commit -m "fix(auth): resolve magic link expiration edge case"
git commit -m "fix(frontend): correct gallery image loading on mobile"

# Breaking changes (major version bump)
git commit -m "feat!: redesign project access API"

# Other types
git commit -m "docs(api): update authentication flow documentation"
git commit -m "test(user-service): add integration tests for magic links"
git commit -m "chore: update dependencies to latest versions"
git commit -m "refactor(event-service): simplify project creation logic"
```

### Local Validation

Before pushing, run our validation suite:

```bash
# Quick validation (runs automatically on commit)
npm run lint
npm run check
npm test

# Build validation
npm run build
```

### Creating Pull Requests

```bash
# Push feature branch
git push origin feat/client-gallery-improvements

# Create PR through GitHub UI or CLI
gh pr create --title "feat(frontend): add client gallery improvements" --body "Description of changes"
```

**PR Requirements:**
- ✅ All pre-commit hooks pass
- ✅ Code review approval required
- ✅ Conventional commit format
- ✅ Tests included for new features
- ✅ Documentation updated if needed

## 🛠️ Development Commands

### Essential Commands

```bash
# Development (only for implemented workspaces)
cd frontend && npm run dev          # Start frontend development
cd services/user-service && npm run dev    # Start specific service
cd shared && npm run dev            # Watch shared package

# Quality Assurance
npm run lint                        # Lint implemented workspaces
npm run check                       # Type checking
npm test                           # Run tests for implemented workspaces

# Building
npm run build                      # Build all implemented workspaces
cd shared && npm run build         # Build specific workspace
```

### Workspace-Specific Development

```bash
# Work in appropriate workspace
cd frontend && npm run dev          # Frontend changes
cd services/portfolio-service && npm run dev    # Service changes
cd shared && npm run dev            # Shared utilities
```

## 📝 Code Standards

### TypeScript
```typescript
// ✅ Good: Explicit types, readonly interfaces
interface ProjectImage {
  readonly id: string;
  readonly url: string;
  readonly metadata: ImageMetadata;
}

// ❌ Bad: Any types, mutable interfaces
interface ProjectImage {
  id: any;
  url: string;
  metadata: any;
}
```

### Photography Domain Patterns
```typescript
// ✅ Good: Unified project model for all photography types
interface Project {
  readonly id: string;
  readonly category: 'weddings' | 'portraits' | 'corporate' | 'landscapes';
  readonly client: {
    readonly name?: string;
    readonly email?: string;
    readonly company?: CompanyInfo; // Only for professional events
  };
}

// ✅ Good: Multi-resolution file handling
interface ProjectImage {
  readonly paths: {
    readonly original: string;   // 25MB+ RAW files
    readonly high: string;       // 2-5MB desktop quality
    readonly medium: string;     // 500KB-1MB mobile
    readonly thumb: string;      // 50-100KB thumbnails
  };
}
```

### Error Handling
```typescript
// ✅ Good: Typed errors with context
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

## 🏛️ Architecture Guidelines

### Service Communication
- **Synchronous**: REST APIs via API Gateway for user-facing operations
- **Asynchronous**: Kafka events for background processing
- **File Access**: Direct serving with authentication middleware

### Photography-Specific Patterns
- **Unified Project Model**: All photography types use same schema
- **Client vs Portfolio Separation**: Private client delivery vs public marketing
- **Multi-Resolution Strategy**: Automatic generation of 4 image sizes
- **Magic Link Access**: Passwordless authentication for clients
- **Self-Hosted Files**: Local storage for cost control

### Data Flow
```
Frontend → API Gateway → Services → Database/Files
                     ↓
                   Kafka Events → Background Processing
```

## 🧪 Testing Guidelines

### Test Requirements
- **New features** must include tests
- **Bug fixes** should include regression tests
- **Co-located tests** (`.spec.ts` files next to source)

### Test Types
```bash
# Unit tests for implemented workspaces
cd shared && npm test
cd services/user-service && npm test

# Integration tests (when services are implemented)
npm run test:integration
```

## 📦 Photography Business Context

Understanding the photography workflow helps with better contributions:

### Client Workflow
1. **Project Creation**: Admin creates project (wedding, portrait, corporate)
2. **Photo Upload**: Bulk upload of 25MB+ RAW files
3. **Processing**: Generate 4 resolutions (thumb/medium/high/original)
4. **Client Invitation**: Send magic link for secure gallery access
5. **Client Access**: View and download via `/portfolio?ref=xyz`
6. **Portfolio Curation**: Select best work for public showcase

### Technical Considerations
- **Large Files**: Handle 25MB+ photos efficiently with streaming
- **Client Privacy**: Secure, isolated access to project galleries
- **Mobile Experience**: Clients primarily view on mobile devices
- **Self-Hosted**: Cost control for 150GB+ photo collections
- **Professional Workflow**: Admin tools for bulk operations

## 🔒 Security Guidelines

- **Never commit secrets** or API keys
- **Client data privacy**: Ensure proper access controls
- **File access**: Validate permissions before serving files
- **Magic links**: Proper expiration and token validation
- **Audit dependencies** regularly (`npm audit`)

## 🐛 Reporting Issues

### Bug Reports
Include:
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Environment details** (browser, Node version)
- **Photography workflow context** if applicable

### Feature Requests
Include:
- **Photography business use case**
- **Proposed solution**
- **Client impact considerations**

## 🤝 Code Review Process

### For Authors
- **Self-review** changes before requesting review
- **Test with realistic photo sizes** and quantities
- **Consider mobile experience** for client-facing features
- **Document photography business context**

### For Reviewers
- **Verify photography workflow alignment**
- **Check file handling efficiency**
- **Validate client privacy and security**
- **Test mobile responsiveness**

## 📚 Additional Resources

- [Implementation Roadmap](./implementation_roadmap.md)
- [Best Practices](./BEST_PRACTICES.md)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## ❓ Getting Help

- **Create an issue** for bugs or questions
- **Check existing documentation** in workspace README files
- **Review roadmaps** for planned features and architecture

---

Thank you for contributing to Temps D'arrêt Studio! 📸