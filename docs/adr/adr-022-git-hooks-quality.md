# ADR-022: Husky Git Hooks for Quality Gates

## Status

Accepted

## Date

2025-08-09

## Context

Our photography platform requires automated quality gates to prevent issues from entering the codebase. Manual quality checks are inconsistent and often missed during development velocity pressure, leading to production issues and technical debt accumulation.

## Decision

We will implement **Husky Git Hooks** to enforce quality gates at commit and push stages, ensuring code quality, security, and conventional commit compliance before code reaches the repository.

## Rationale

### Automated Quality Enforcement

Git hooks provide the last line of defense before code enters the repository:

```bash
#!/usr/bin/env sh
# .husky/pre-commit
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit quality checks..."

# Run ESLint on staged files
npx lint-staged

# Type checking
npm run type-check

# Security scan
npm run scan:security

echo "✅ Pre-commit checks passed!"
```

### Photography-Specific Quality Rules

```javascript
// lint-staged configuration for photography platform
{
  "lint-staged": {
    "*.{ts,js,svelte}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{jpg,jpeg,png}": [
      "imagemin --plugin.mozjpeg.quality=80",
      "git add"
    ],
    "packages/models/**/*.tsp": [
      "tsp format",
      "tsp compile --no-emit --check"
    ]
  }
}
```

### Commit Message Validation

```bash
#!/usr/bin/env sh
# .husky/commit-msg
. "$(dirname -- "$0")/_/husky.sh"

npx commitlint --edit $1

if [ $? -ne 0 ]; then
  echo "📋 Photography platform commit examples:"
  echo "  feat(gallery): add photo favorite marking"
  echo "  fix(upload): resolve large file timeout"
  echo "  feat(shoots): implement status workflow"
  exit 1
fi
```

## Implementation Guidelines

### Hook Configuration

```json
// package.json
{
  "scripts": {
    "prepare": "husky install",
    "pre-commit": "lint-staged",
    "commit-msg": "commitlint --edit",
    "pre-push": "npm run test:ci && npm run build"
  }
}
```

### Quality Gate Pipeline

```bash
#!/usr/bin/env sh
# .husky/pre-push
. "$(dirname -- "$0")/_/husky.sh"

echo "🚀 Running pre-push quality gates..."

# Full test suite
npm run test:all

# Build verification
npm run build:all

# Container security scan
npm run scan:containers

echo "✅ Ready for push!"
```

## Trade-offs

### Benefits Gained
- **Automated quality enforcement** preventing manual oversight
- **Consistent code standards** across all team members
- **Early issue detection** before code review stage
- **Security vulnerability prevention** through automated scanning

### Accepted Trade-offs
- **Development friction** from quality check overhead
- **Commit time increase** due to automated validation
- **Tool dependency** on Git hook ecosystem

## Consequences

Husky Git hooks provide automated quality gates that maintain code standards and prevent issues from entering the repository, supporting our professional photography platform development workflow.