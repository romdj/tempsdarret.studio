# ADR-016: Conventional Commits with Photography Domain Scopes

## Status

Accepted

## Date

2025-08-09

## Context

Our photography platform requires clear, consistent commit messaging that supports automated changelog generation, semantic versioning, and helps developers understand changes across multiple microservices and frontend components.

### Requirements
- **Clear intent communication** for business logic changes
- **Automated tooling support** for CI/CD and releases
- **Domain-specific context** for photography business logic
- **Team productivity** through consistent patterns
- **Audit trail** for business-critical changes

### Current Challenges
- Inconsistent commit messages across team members
- Difficulty tracking changes across microservices
- Manual effort required for changelog generation
- Business context often missing from technical commits

## Decision

We will adopt **Conventional Commits** specification with **photography domain-specific scopes** tailored to our business context and service architecture.

## Rationale

### Conventional Commits Structure
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Photography Platform Scopes

**Service Scopes:**
- `shoot-service`: Shoot management microservice
- `user-service`: User authentication and management
- `invite-service`: Magic link invitation system
- `file-service`: Photo/video file processing
- `notification-service`: Email and notification handling
- `api-gateway`: API gateway and routing
- `frontend`: SvelteKit frontend application
- `client-portal`: Client-facing gallery interface

**Domain-Specific Scopes:**
- `shoots`: Shoot creation, management, lifecycle
- `gallery`: Photo galleries and viewing
- `upload`: File upload functionality  
- `magic-links`: Passwordless authentication
- `pricing`: Pricing models and calculations
- `workflow`: Business workflow automation
- `metadata`: Photography metadata handling
- `processing`: Image/video processing pipelines

**Technical Scopes:**
- `api`: API endpoints and contracts
- `events`: Event-driven messaging
- `storage`: File storage and retrieval
- `auth`: Authentication and authorization
- `database`: Database operations
- `config`: Configuration management
- `tests`: Testing infrastructure
- `docs`: Documentation updates
- `ci`: Continuous integration
- `docker`: Containerization
- `k8s`: Kubernetes deployment

### Commit Types

**Feature Development:**
- `feat`: New business functionality
- `fix`: Bug fixes
- `perf`: Performance improvements
- `refactor`: Code restructuring without behavior changes

**Infrastructure & Tooling:**
- `build`: Build system changes
- `ci`: CI/CD pipeline changes
- `test`: Adding or updating tests
- `docs`: Documentation updates

**Maintenance:**
- `chore`: Maintenance tasks
- `deps`: Dependency updates
- `config`: Configuration changes
- `style`: Code formatting (no logic changes)

## Implementation Examples

### Business Logic Changes
```bash
# Shoot management features
feat(shoots): add scheduled date validation for wedding bookings
feat(shoot-service): implement shoot status transition workflow
fix(shoots): prevent double-booking of photographers

# Gallery functionality
feat(gallery): add watermark overlay for client preview images
feat(client-portal): implement download progress indicator
fix(gallery): resolve thumbnail generation for HEIC files

# File processing
feat(file-service): add RAW file processing pipeline
feat(processing): implement multi-resolution image generation
perf(upload): optimize large file chunked upload performance
```

### API and Integration Changes
```bash
# API development following TypeSpec (ADR-002)
feat(api): add shoot pricing calculation endpoints
fix(api-gateway): resolve CORS issues for client portal
refactor(api): migrate shoot endpoints to functional structure

# Event-driven changes (ADR-009)
feat(events): add shoot completion notification workflow
fix(invite-service): resolve magic link expiration edge case
refactor(events): standardize event payload schemas across services
```

### Technical Infrastructure
```bash
# Microservice architecture (ADR-001)
feat(docker): add multi-stage build for production optimization
feat(k8s): implement horizontal pod autoscaling for file service
fix(database): resolve MongoDB connection pooling issues

# Testing strategy (ADR-014)
test(shoot-service): add component tests for invitation workflow
test(frontend): implement E2E tests for client gallery access
fix(tests): resolve flaky integration tests in CI pipeline
```

### Breaking Changes
```bash
# Breaking changes require explanation
feat(api)!: migrate shoot creation to async workflow

BREAKING CHANGE: Shoot creation now returns 202 Accepted with 
operation ID instead of 201 Created with shoot data. Clients 
must poll /operations/{id} for completion status.

Closes #123
```

### Multi-scope Changes
```bash
# Changes affecting multiple areas
feat(workflow): implement end-to-end shoot invitation flow

- Add shoot creation in shoot-service
- Trigger user verification in user-service  
- Generate magic links in invite-service
- Send email notifications via notification-service

Closes #456
```

## Tooling Integration

### Commit Message Validation
```javascript
// .commitlintrc.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', [
      // Service scopes
      'shoot-service', 'user-service', 'invite-service', 
      'file-service', 'notification-service', 'api-gateway',
      'frontend', 'client-portal',
      
      // Domain scopes
      'shoots', 'gallery', 'upload', 'magic-links', 
      'pricing', 'workflow', 'metadata', 'processing',
      
      // Technical scopes
      'api', 'events', 'storage', 'auth', 'database',
      'config', 'tests', 'docs', 'ci', 'docker', 'k8s'
    ]],
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'test', 'chore', 'perf', 'ci', 'build', 'deps'
    ]],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100]
  }
};
```

### Automated Changelog Generation
```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Generate Changelog
        run: |
          npx conventional-changelog-cli -p angular -i CHANGELOG.md -s
          
      - name: Create Release
        uses: semantic-release/semantic-release@v21
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Git Hooks Integration
```bash
# .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit $1

# Provide helpful examples on failure
if [ $? -ne 0 ]; then
  echo ""
  echo "📋 Commit message examples for photography platform:"
  echo ""
  echo "✅ Good examples:"
  echo "  feat(client-portal): add photo favorite marking system"
  echo "  fix(magic-links): resolve token expiration edge case"
  echo "  feat(file-service): implement multi-resolution processing"
  echo "  fix(frontend): correct gallery scrolling on iOS devices"
  echo "  docs(api): update authentication flow documentation"
  echo "  perf(gallery): optimize image loading for 50+ photos"
  echo ""
  echo "❌ Bad examples:"
  echo "  Add new feature"
  echo "  Fixed bug"  
  echo "  Update code"
  echo "  WIP"
  echo ""
  echo "Photography business scopes include:"
  echo "  - shoots, gallery, upload, magic-links, pricing"
  echo "  - client-portal, file-service, workflow"
  echo "  - processing, metadata, storage, auth"
  echo ""
  exit 1
fi
```

## Semantic Versioning Integration

### Automated Version Bumping
```json
// package.json
{
  "scripts": {
    "release": "semantic-release",
    "release:dry": "semantic-release --dry-run"
  },
  "release": {
    "branches": ["main"],
    "plugins": [
      "@semantic-release/commit-analyzer",
      "@semantic-release/release-notes-generator",
      "@semantic-release/changelog",
      "@semantic-release/npm",
      "@semantic-release/github"
    ]
  }
}
```

### Version Rules
- `fix`: Patch release (1.0.1)
- `feat`: Minor release (1.1.0)
- `BREAKING CHANGE`: Major release (2.0.0)
- `perf`: Patch release with performance label
- Other types: No version bump

## Development Workflow

### Pull Request Titles
Pull request titles should also follow conventional commit format:
```
feat(gallery): implement client photo selection interface

This PR adds the ability for clients to mark photos as favorites 
in their gallery view, supporting the wedding photographer workflow
where clients need to select photos for albums.

- Add favorite/unfavorite buttons to gallery grid
- Implement client preference persistence  
- Add photographer view of client selections
- Update gallery API with selection endpoints

Closes #789
```

### Commit Message Guidelines

**DO:**
- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Limit first line to 72 characters
- Reference issues and pull requests when applicable
- Include business context for domain changes

**DON'T:**
- Use generic messages like "fix bug" or "update code"
- Include file names unless specifically relevant
- Use abbreviations that aren't widely understood
- Commit work-in-progress without clear intent

### Business Context Examples

```bash
# Good: Explains business impact
feat(pricing): add wedding package tier with unlimited hours
fix(shoots): prevent client double-booking same photographer date

# Bad: Only technical details  
feat(api): add new endpoint
fix(database): update query
```

## Integration with Issue Tracking

### Issue References
```bash
# Link commits to issues for traceability
feat(client-portal): add download progress indicator

Implements download progress bar for large RAW file downloads
to improve client experience during gallery access.

Closes #234
References #156, #189
```

### Milestone Tracking
```bash
# Group commits by milestone
feat(v2.0): implement multi-photographer shoot support

Part of V2.0 milestone expanding platform to support
photography studio workflows with multiple photographers.

Milestone: V2.0-Multi-Photographer
Epic: #456
```

## Trade-offs

### Accepted Trade-offs
- **Initial learning curve** for team members unfamiliar with conventional commits
- **Enforcement overhead** through git hooks and CI validation
- **Verbose commit messages** compared to informal approaches

### Benefits Gained
- **Automated changelog generation** reducing manual release notes effort
- **Clear business context** for all changes across the platform
- **Improved collaboration** through consistent communication patterns
- **Better debugging** with clear change history and context

## Consequences

### Positive
- Automated semantic versioning and changelog generation
- Clear communication of business impact for all changes
- Improved onboarding with consistent patterns
- Better integration with issue tracking and project management

### Negative
- Additional cognitive overhead for commit message composition
- Potential for over-engineering simple changes
- Need for team training and adoption period

### Neutral
- Git history becomes more verbose but more informative
- Tooling setup required for validation and automation
- Need to maintain scope list as platform evolves

## Compliance

This decision will be enforced through:
- **Git hooks** preventing non-conforming commits
- **CI/CD validation** blocking builds with invalid messages  
- **Code review guidelines** checking commit message quality
- **Team documentation** with examples and best practices
- **Onboarding checklist** including conventional commit training