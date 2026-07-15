# CI/CD Pipeline Overview

Single-page view of all builds, tests, and quality checks.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PR / Push to main                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────▼────────────┐
                │  🔍 Quality Checks      │
                │  - Lint (all services)  │
                │  - Type Check (all)     │
                │  - Circular Deps        │
                └────────────┬────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│ 🏗️ Build Matrix │  │ 🧪 Test Matrix  │  │ 🔒 Security    │
│                 │  │                 │  │    Audit       │
│ • user-service  │  │ Per service:    │  │                │
│ • invite-svc    │  │ • Unit tests    │  │ • npm audit    │
│ • portfolio-svc │  │ • Component     │  │ • Outdated     │
│ • shoot-service │  │                 │  │   deps check   │
│ • file-service  │  │ Infrastructure: │  └────────────────┘
│ • notify-svc    │  │ • MongoDB       │
│ • shared pkg    │  │ • Redis         │
│ • frontend      │  │                 │
│                 │  │ 8 services ×    │
│ (Parallel)      │  │ 2 test types    │
└────────┬────────┘  │ = 16 jobs       │
         │           │                 │
         │           │ (Parallel)      │
         └───────────┴────────┬────────┘
                              │
                    ┌─────────▼─────────┐
                    │ 📊 Coverage       │
                    │                   │
                    │ • All services    │
                    │ • Upload Codecov  │
                    │ • Artifacts       │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ ✅ CI Success     │
                    │                   │
                    │ Summary of all    │
                    │ job results       │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ 🐳 Docker Build   │ (main only)
                    │                   │
                    │ • Kong Gateway    │
                    │ • All services    │
                    │ • Frontend        │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ 🚀 Ready for      │ (main only)
                    │    Deployment     │
                    └───────────────────┘
```

## Job Details

### 1. 🔍 Quality Checks (~2 mins)

**Purpose**: Fast feedback on code quality

**Jobs**:
- Lint all services (ESLint)
- Type check all services (TypeScript)
- Check for circular dependencies (madge)

**Triggers**: Every push and PR

**Artifacts**: None

---

### 2. 🏗️ Build Matrix (~3-5 mins)

**Purpose**: Ensure all services build successfully

**Jobs** (parallel):
1. user-service
2. invitation-service
3. portfolio-service
4. shoot-service
5. file-service
6. notification-service
7. shared (package)
8. frontend

**Artifacts**: Build outputs cached

---

### 3. 🧪 Test Matrix (~5-10 mins)

**Purpose**: Comprehensive testing across all services

**Matrix**:
- **Services**: 6 microservices
- **Test Types**: unit, component
- **Total Jobs**: 12 parallel jobs

**Infrastructure**:
- MongoDB 7.0 (service container)
- Redis 7.2 (service container)

**Artifacts**: Test results (7 day retention)

---

### 4. 📊 Coverage (~3-5 mins)

**Purpose**: Code coverage analysis

**Process**:
- Runs after all tests complete
- Collects coverage from all services
- Uploads to Codecov
- Stores artifacts

**Artifacts**: Coverage reports (30 day retention)

---

### 5. 🔒 Security Audit (~1-2 mins)

**Purpose**: Vulnerability scanning

**Checks**:
- npm audit (moderate level)
- Outdated dependency check

**Continues on error**: Yes (informational)

---

### 6. 🐳 Docker Build (~5-10 mins)

**Purpose**: Build container images

**Triggers**: Only on main branch pushes

**Images**:
- Kong Gateway
- All 6 microservices
- Frontend

**Strategy**: Parallel builds, fail-fast disabled

---

### 7. ✅ CI Success (instant)

**Purpose**: Pipeline status summary

**Checks**:
- All critical jobs succeeded
- Quality checks passed
- All builds succeeded
- All tests passed

**Fails if**: Any critical job fails

---

### 8. 🚀 Deployment Ready (instant)

**Purpose**: Deployment readiness notification

**Triggers**: Only on main branch after CI success

**Output**:
- Deployment readiness confirmation
- Next steps guidance

---

## Viewing the Pipeline

### GitHub Actions UI

Go to: **Actions** tab → **CI/CD Pipeline**

You'll see a single run with all jobs organized in stages:

```
CI/CD Pipeline
├─ 🔍 Quality Checks
├─ 🏗️ Build Matrix (8 jobs)
├─ 🧪 Test Matrix (12 jobs)
├─ 📊 Coverage
├─ 🔒 Security Audit
├─ 🐳 Docker Build (8 jobs) [main only]
├─ ✅ CI Success
└─ 🚀 Deployment Ready [main only]
```

### Status Badge

```markdown
[![CI/CD Pipeline](https://github.com/romdj/tempsdarret.studio/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/romdj/tempsdarret.studio/actions/workflows/ci.yml)
```

## Optimizations

### Speed

- **Parallel execution**: Jobs run simultaneously when possible
- **Dependency caching**: npm cache, build artifacts
- **Fail-fast**: Critical failures stop dependent jobs
- **Concurrency control**: Cancel outdated runs for same branch

### Resource Efficiency

- **Service containers**: Shared MongoDB/Redis for tests
- **Matrix strategy**: Avoid duplication
- **Conditional jobs**: Docker build only on main

### Developer Experience

- **Single page view**: All results in one place
- **Clear job names**: Easy to identify failures
- **Emoji indicators**: Visual job categorization
- **Detailed summaries**: CI Success job provides overview

## Typical Execution Times

| Branch Type | Duration | Jobs Run |
|-------------|----------|----------|
| PR | ~8-12 mins | 28 jobs |
| Main (push) | ~15-20 mins | 36 jobs |
| Main (no code changes) | ~2-3 mins | Skipped via cache |

## Troubleshooting

### Job Fails: Quality Checks

**Check**: Linting or type errors
**Fix**: Run `npm run lint` and `npm run check` locally
**Prevention**: Enable pre-commit hooks

### Job Fails: Build Matrix

**Check**: Specific service build failure
**Fix**: Run `npm run build` in that service directory
**Prevention**: Test builds locally before pushing

### Job Fails: Test Matrix

**Check**: Which service and test type failed
**Fix**: Run tests locally for that service
**Logs**: Download test results artifact

### Job Fails: Coverage

**Check**: Coverage threshold not met
**Fix**: Add more tests or adjust threshold
**Note**: This is informational, won't block PR

## Future Enhancements

- [ ] E2E tests (integration across services)
- [ ] Performance regression tests
- [ ] Bundle size checks (frontend)
- [ ] Visual regression testing
- [ ] Automated deployment to staging
- [ ] Production deployment workflow
