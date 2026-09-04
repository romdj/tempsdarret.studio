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
                    ┌────────────▼────────────┐
                    │  🏗️ Build Matrix        │
                    │  9 components, parallel │
                    └────────────┬────────────┘
                                 │
              All 9 jobs below fan out together off the build
              matrix and run fully concurrently — none of them
              needs another's results, only the build:
                                 │
        ┌───────────┬───────────┼───────────┬─────────────────┐
        │           │           │           │                 │
┌───────▼──────┐┌───▼────────┐┌─▼─────────┐┌▼──────────┐┌─────▼──────┐
│ 🧪 Component ││🔗 Integration││📜 Contract││🎬 E2E     ││📊 Coverage │
│ (6 svc, w/   ││(6 svc, w/   ││(6 svc)    ││in-process ││per-service,│
│ Mongo/Redis/ ││Mongo/Redis/ ││           ││flows      ││no swallow  │
│ Kafka)       ││Kafka)       ││           ││           ││            │
└──────────────┘└─────────────┘└───────────┘└───────────┘└─────┬──────┘
        ┌───────────┬───────────┬───────────────────────────────┘
        │           │           │
┌───────▼──────┐┌───▼────────┐┌─▼─────────────────┐┌────────────────────┐
│🔒 Security   ││🛡️ SAST     ││🕷️ DAST             ││📈 Code Quality     │
│Audit         ││CodeQL      ││ZAP baseline        ││SonarQube Cloud     │
│(pnpm audit)  ││            ││(built frontend)    ││                    │
└───────┬──────┘└─────┬──────┘└─────────┬──────────┘└──────────┬─────────┘
        │             │                 │                      │
        └─────────────┴────────┬────────┴──────────────────────┘
                                │
                      ┌─────────▼─────────┐
                      │ ✅ CI Success     │
                      │                   │
                      │ Blocking: all 4   │
                      │ test tiers +      │
                      │ coverage/security/│
                      │ SAST/DAST/quality │
                      └─────────┬─────────┘
                                │
                      ┌─────────▼─────────┐
                      │ 🚀 Ready for      │ (main only)
                      │    Deployment     │
                      └───────────────────┘
```

> **Note on drift**: the "Docker Build" stage and Codecov upload described in older
> revisions of this doc were aspirational and were never implemented in
> `ci.yml` — removed here rather than perpetuated. If/when a Docker image
> build stage is added, document it here alongside the job it actually maps to.

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
- Runs alongside component/integration/contract/e2e (not after them) — it
  re-executes each service's own `test:coverage`, so it only needs the build
- Runs `pnpm run test:coverage` per service, no error-swallowing

**Blocking**: Yes — a crashing coverage run fails the job and `ci-success`.
Per-service `coverage.thresholds` (line/branch/function floors) are the next
step to make a *regression in coverage %*, not just a crash, fail the build
too — not yet configured project-wide (see the coverage job's comment in
`ci.yml`).

---

### 5. 🔒 Security Audit (~1-2 mins)

**Purpose**: Vulnerability scanning

**Checks**:
- `pnpm audit --audit-level=high`
- Outdated dependency check (informational only)

**Blocking**: Yes, for the audit step — a high or critical vulnerability
fails the job; moderate/low are visible in the log but don't block (policy
2026-09-04). There's a real, tracked backlog behind this threshold too —
see the job's comment in `ci.yml` for the current count and root packages.
If a specific high/critical finding turns out to have no fix yet, document
an explicit allowlist rather than reintroducing `continue-on-error`.

---

### 6. 🛡️ SAST — CodeQL (~2-4 mins)

**Purpose**: Static analysis for security vulnerabilities (injection, unsafe
regex, prototype pollution, etc.) across the JS/TypeScript codebase.

**Runs**: `github/codeql-action/init` + `analyze`, `javascript-typescript`.

**Blocking**: The job fails if the analysis itself errors. Findings surface
as Code Scanning alerts in the Security tab — reacting to those (or setting
a branch protection rule that requires this check) is a separate, deliberate
step, not automatic today.

---

### 7. 🕷️ DAST — OWASP ZAP Baseline (~3-5 mins)

**Purpose**: Dynamic scan of the actual shipped artifact — builds the static
SvelteKit frontend, serves it locally (`vite preview`), and runs ZAP's
baseline scan against it.

**Blocking**: Yes (`fail_action: true`).

**Known limitation**: this only covers the public static frontend, not the
backend microservices — a DAST pass against the full docker-compose stack
(auth flows, API endpoints) is future work.

---

### 8. 📈 Code Quality — SonarQube Cloud (~2-4 mins)

**Purpose**: Maintainability, duplication, and quality-gate scoring across
the whole monorepo, via `sonar-project.properties`.

**Blocking**: Yes — `SONAR_TOKEN` was added 2026-09-02, so this is now a
required check on `ci-success` like the others. It runs on its own fresh
checkout without the `coverage` job's lcov output (no artifact wiring
between them), so it's currently scoring without merged coverage data —
flagged as follow-up work.

---

### 9. ✅ CI Success (instant)

**Purpose**: Pipeline status summary

**Checks**:
- All critical jobs succeeded
- Quality checks passed
- All builds succeeded
- All tests passed

**Fails if**: Any critical job fails

---

### 10. 🚀 Deployment Ready (instant)

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
├─ 🏗️ Build Matrix (9 jobs)
├─ 🧪 Component / Integration / Contract / E2E tests (24 jobs)
├─ 📊 Coverage
├─ 🔒 Security Audit
├─ 🛡️ SAST (CodeQL)
├─ 🕷️ DAST (ZAP baseline)
├─ 📈 Code Quality (SonarQube Cloud)
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

**Check**: The coverage run crashed for a service (or, once thresholds are
configured, dropped below the configured floor)
**Fix**: Run `pnpm run test:coverage` in that service directory locally
**Note**: This blocks `ci-success` — it is not informational

### Job Fails: SAST (CodeQL)

**Check**: Actions tab → job logs for an analysis error (not the same as a
security finding, which shows as a Code Scanning alert instead)
**Fix**: Usually a transient runner issue; re-run the job

### Job Fails: DAST (ZAP baseline)

**Check**: Download the `zap_scan` artifact for the full alert report
**Fix**: Triage each alert — fix real findings, or add a suppression to a
`rules_file_name` TSV if it's a confirmed false positive

### Job Fails: Code Quality (SonarQube Cloud)

**Check**: Actions tab → job logs, or the quality gate status at
sonarcloud.io for the project
**Fix**: A red quality gate blocks the scan step itself
(`sonar.qualitygate.wait=true`) — fix the flagged issue, or adjust the gate
conditions on sonarcloud.io if it's too strict for where the codebase is
today

## Future Enhancements

- [x] E2E tests (integration across services)
- [x] Security audit blocking (`pnpm audit`)
- [x] SAST (CodeQL)
- [x] DAST (OWASP ZAP baseline, against the static frontend)
- [x] Code quality blocking (SonarQube Cloud, `SONAR_TOKEN` set 2026-09-02)
- [ ] Per-service coverage % thresholds (currently only "did the run crash" is blocking, not "did coverage regress")
- [ ] Wire the `coverage` job's lcov output into `code-quality-sonar` via upload/download-artifact so Sonar scores real coverage data
- [ ] DAST against the full backend (docker-compose stack), not just the static frontend
- [ ] Performance regression tests
- [ ] Bundle size checks (frontend)
- [ ] Visual regression testing
- [ ] Automated deployment to staging
- [ ] Production deployment workflow
