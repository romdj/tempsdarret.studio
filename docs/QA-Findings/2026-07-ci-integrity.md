# QA Findings — CI integrity audit (2026-07)

Source: investigation triggered by CI reporting **green** while the coverage
output showed widespread test failures.

Priority: `P1` (do now) · `P2` (soon) · `P3` (later)

| ID | Pri | Status | Finding |
|----|-----|--------|---------|
| CI-1 | P1 | OPEN | Test steps swallow all failures — the CI gate is cosmetic |
| CI-2 | P1 | OPEN | Rotted test suite hidden by CI-1 (stale imports, dep skew, real bugs) |

### CI-1 · P1 · Test steps swallow all failures
Every test tier in `.github/workflows/ci.yml` runs with **both** `|| echo "No
… tests"` **and** `continue-on-error: true` — unit (`:107`), component (`:190`),
integration (`:270`), contract (`:326`), coverage (`:392`). The `|| echo` forces
a 0 exit even when the test command fails; `continue-on-error` greens the step
regardless. Result: no test failure can ever fail the pipeline. "All commits to
main pass CI" is not true for tests.
**Acceptance criteria**
- Test failures fail their CI job (remove `|| echo …` and `continue-on-error` on
  test steps), so a red test → red pipeline.
- Removal is sequenced per service so the gate is turned on only once that
  service's tests actually pass (see CI-2) — no permanently-red main.

### CI-2 · P1 · Rotted test suite hidden by CI-1
With the gate off, the suite has decayed. Observed failures:
- **Stale imports:** `user-service` + `shoot-service` contract tests import a
  non-existent `src/server`; `shoot-service` integration imports the removed
  `src/features/shoots/**` (deleted in the ADR-030 consolidation).
- **Dependency skew:** `invitation-service` has `vitest@2.1.9` vs
  `@vitest/coverage-v8@3.2.4` → coverage crashes (`ctx.getRootProject is not a
  function`).
- **Incomplete Vitest migration:** `portfolio-service` and `file-service` still
  use Jest (`jest: not found`, jest-config TS errors) — same class as the
  notification-service migration already done.
- **Genuine bugs:** `shoot-access.service` (6 failing — wrong access-validation
  reasons/results) and `shoot-reference` (3 failing — consecutive hyphens not
  collapsed) are real defects in code or tests.
- **Wrong test setup:** `shoot-service` component tests dial a real Kafka broker
  (`localhost:9093`) not present in the job, and `mongoose.connect` is called
  twice (active-connection error).
**Acceptance criteria**
- Each service's unit/component/integration/contract tests either pass or are
  explicitly quarantined with a note; stale tests referencing deleted code are
  removed/fixed; the Jest holdouts finish migrating to Vitest; dep versions
  align; the real `shoot-access`/`shoot-reference` bugs are fixed (TDD).
- Once a service is green, its CI swallowing (CI-1) is removed so it gates.
