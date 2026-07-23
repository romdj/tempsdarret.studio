# WS2 Service Test Inventory (all tiers) — 2026-07-22

Read-only classification of every failing/erroring test file across the six
`services/` after WS1 (Vitest standardization). Drives the WS2 fixers. **No code
was changed.** Buckets: **A** real source bug · **B** stale/broken test · **C**
needs testability refactor (source) · **D** needs external infra · **E** unbuilt
feature (quarantine).

**Runner note:** `pnpm` is not on this machine; suites were run with each
service's local `vitest` via `npm test` / `npm run test:<tier>`. Available infra:
Mongo `mongodb://admin:admin_password@localhost:27017` and Kafka `localhost:9093`
(both up). Discovery works everywhere — all failures below are real.

---

## shoot-service

`test`: 6 files → 2 pass, 1 skip, 3 fail.

| Failing file | Root cause | Bucket | Recommended action | Owner | Infra |
|---|---|---|---|---|---|
| `tests/contract/shoot-api.contract.test.ts:3` | imports missing `../../src/server` (`createServer`); `src/main.ts` wraps everything in `ShootServiceApp` that connects Kafka (main.ts:20) + `listen` (main.ts:48) | **C** | extract exported `createServer()`/`buildServer()` (Fastify only, no Kafka/listen) so test can `inject()` | fullstack | none |
| `tests/integration/shoot-crud-workflow.integration.test.ts:2` | imports deleted `../../src/features/shoots/services/shoot.service` + `.../controllers/*` | **B** | retarget to `src/services/shoot.service` + `src/handlers/shoot.handlers`; verify `ShootController`→handlers signature shift, not just path | test-developer | none |
| `tests/component/shoot-service.component.test.ts` | uses `@testcontainers/*` to spin ephemeral Mongo+Kafka (needs Docker daemon); **also** global `tests/setup.ts` does its own `MongoMemoryServer` + `mongoose.connect` that collides with `component-setup.ts` → `afterAll` `dropDatabase` errored `requires authentication` | **D** + smell | decouple from real broker (mock or gate testcontainers) and fix the double `mongoose.connect` (global setup applies to component file too) | fullstack | Docker (testcontainers) |
| `tests/unit/shoot-access.service.test.ts` | already `describe.skip` (unbuilt shoot-access feature) | **E** | leave quarantined; ensure BACKLOG line exists | test-developer | none |

Pass: `tests/unit/shoot-reference.test.ts`, `tests/services/shoot.service.test.ts`.
**Verdict:** 1 test-fix (B) + 1 refactor (C) + 1 infra-decouple (D+smell); 1 already-quarantined. Reaches green without external infra once component is mocked/decoupled.

---

## user-service

`test`: 2 files → 1 pass, 1 fail.

| Failing file | Root cause | Bucket | Recommended action | Owner | Infra |
|---|---|---|---|---|---|
| `tests/contract/user-api.contract.test.ts:3` | imports missing `../../src/server` (`createServer`); `src/main.ts` `start()` entangles Kafka (main.ts:15) + `mongoose.connect` (main.ts:20) + `listen` (main.ts:40) | **C** | extract exported `createServer()` factory (same pattern as shoot-service) | fullstack | none |

Pass: `src/services/user.service.test.ts` (colocated unit).
Note: `test:unit` script targets `src/services` (colocated) — fine, no `tests/unit` dir.
**Verdict:** 1 refactor (C). No infra.

---

## invitation-service

`test`: 2 files → 1 pass, 1 fail (2 cases).

| Failing file | Root cause | Bucket | Recommended action | Owner | Infra |
|---|---|---|---|---|---|
| `tests/contract/invitation-api.contract.test.ts:222,268` | "valid" fixtures use a **72-char** token, but `MagicLinkValidationRequestSchema` (packages/shared/src/schemas/invite.schema.ts:69) requires `/^[a-f0-9]{64}$/`. The test comment even says "64-char hex token" — data is wrong, schema is right. | **B** | shorten the two fixture tokens to exactly 64 hex chars | test-developer | none |

Pass: `tests/services/invitation.service.test.ts` (31 cases).
**Verdict:** 1 test-data fix (B), 2 assertions. No infra.

---

## portfolio-service

`test`: 6 files → 2 pass, 4 fail. (No `src/events` → no event tests to add, per plan.)

| Failing file | Root cause | Bucket | Recommended action | Owner | Infra |
|---|---|---|---|---|---|
| `tests/unit/portfolio.repository.test.ts:41` | `PortfolioModel` is `vi.mock`'d as a **plain object** (test:7-16), not a `vi.fn()` constructor, so `PortfolioModel.mockImplementation` doesn't exist (`create` test only) | **B** | mock `PortfolioModel` as `vi.fn()` and attach the static methods (`findOne`, `find`, …) | test-developer | none |
| `tests/integration/portfolio-api.integration.test.ts:12` | DSN `mongodb://localhost:27017/...` has **no credentials** (infra needs `admin:admin_password`) → every write 500s `find requires authentication`; Kafka points at `localhost:9092` but infra is **9093** | **B** | fix DSN (add creds) + Kafka port 9092→9093 | test-developer | uses local Mongo+Kafka (up) |
| `tests/integration/gallery-api.integration.test.ts:11` | same wrong DSN + Kafka port | **B** | same fix | test-developer | uses local Mongo+Kafka (up) |
| `tests/component/portfolio-service.component.test.ts:13` | same wrong DSN/port, **plus** `app.start()` binds hardcoded port 3004 → `EADDRINUSE` when the 3 HTTP suites run together | **B** (+opt C) | fix DSN/port; make integration use `inject()` without `listen()` (or per-suite port) to kill the 3004 collision | test-developer (+fullstack for main.ts inject-only) | uses local Mongo+Kafka (up) |

Pass: `tests/unit/gallery.service.test.ts`, `tests/unit/portfolio.service.test.ts`.
**Determinism risk:** hardcoded 3004 across 3 suites → order/parallelism-dependent EADDRINUSE.
**Verdict:** 4 test-fixes (B); local infra already up (just needs correct creds/port); one small `listen()` isolation tweak. No new infra.

---

## file-service

`test`: 4 files → 1 pass, 3 fail (12 cases). Kafka producer is an explicit in-source mock (`MockEventProducer`, main.ts:26) — no broker needed.

| Failing file / case | Root cause | Bucket | Recommended action | Owner | Infra |
|---|---|---|---|---|---|
| `tests/services/FileService.test.ts` — 6× `uploadFile` (`:95`…) | `mockFileModel` is a plain object (test:16-25), not a `vi.fn()` constructor → `mockFileModel.mockImplementation` throws | **B** | make `mockFileModel` a `vi.fn()` constructor with static methods attached | test-developer | none |
| …`createDownloadStream > chunked` (`:325`) | `shouldUseChunking` received 1024 (default `getFileStats` size), test expected 52428800 — per-test size override not wired | **B** | override `getFileStats` size in that test | test-developer | none |
| …`listFiles > filter by photographer-only` (`:269`) | source `listFiles` filter (FileService.ts:137) maps `shootId/type/processingStatus/tags` but **ignores `photographerOnly`**; test expects it in the query | **A** or **E** | confirm `FileQuery` supports `photographerOnly`; if yes add filter mapping (source), else fix/quarantine test | fullstack (verify) | none |
| …`deleteFile > emit event` (`:357`) | `transformFileDocument` (files.mongoose.ts:163) calls `doc.createdAt.toISOString()`; test mock supplies `createdAt` as an **ISO string** → not a function | **A**/**B** (ambiguous) | preferred: coerce in source `new Date(doc.createdAt).toISOString()` (robust); alt: mocks return `Date`. Pick one, apply everywhere | fullstack | none |
| `tests/handlers/FileHandlers.test.ts` — `uploadFile validation` (`:390`) | handler guards `!file.data` (FileHandlers.ts:45) but crashes when `file` itself is undefined → returns `UPLOAD_FAILED` instead of `INVALID_FILE` | **A** | guard `!file || !file.data` in handler | fullstack | none |
| `tests/handlers/FileHandlers.test.ts` — `listFiles filtering` (`:438`) | same list-filter/mock family as above | **B** (pending) | align with listFiles filter fix | test-developer | none |
| `tests/integration/integration.test.ts:8` | imports missing `../../src/server.js`; a local `createServer()` exists at main.ts:38 but is **not exported** and there's no `src/server.ts` | **C** | extract/export `createServer()` into `src/server.ts` | fullstack | none |

Pass: `tests/services/StorageService.test.ts`.
**Verdict:** ~8 test-mock fixes (B) + 2 source bugs (A: handler null-guard, date coercion) + 1 `photographerOnly` decision (A/E) + 1 refactor (C: export createServer). No external infra.

---

## notification-service

`test`: reports **2 passed / green** — but `vitest.config.ts` uses an `include`
**allowlist of only 2 files**, so **5 test files never run** (silent). This makes
`pnpm test` falsely green — a CI-integrity hazard on top of the migration debt.
All 5 hidden files mock Resend (email) and need **no external infra**.

| Hidden file (excluded by `include`) | Root cause | Bucket | Recommended action | Owner | Infra |
|---|---|---|---|---|---|
| `tests/unit/services/TemplateService.test.ts` | uses bare `describe/it` globals, no `vitest` import, `globals` not set (no jest.* though) | **B** (light) | add vitest imports (or enable `globals`), add to `include` | test-developer | none |
| `tests/unit/services/repositories/EmailRepository.test.ts` | `jest.fn/mock/spyOn` on removed jest runner (~490 lines, Resend mocked) | **B** | port `jest.*`→`vi.*`, add to `include` | test-developer | none |
| `tests/component/MultiChannelNotification.test.ts` | `jest.Mocked/fn/mock/spyOn`; Resend mocked | **B** | port to `vi.*`, add to `include` | test-developer | none |
| `tests/integration/EventConsumerIntegration.test.ts` | `jest.clearAllMocks/fn/mock/spyOn`; Resend mocked (verify Kafka is mocked, not dialed) | **B** | port to `vi.*`; confirm no real broker; add to `include` | test-developer | none (verify) |
| `tests/performance/NotificationPerformance.test.ts` | `jest.fn/mock`; perf tier (timing-based) | **B** | port to `vi.*`; consider keeping out of the commit/CI gate (perf, flaky by nature) | test-developer | none |

Pass (and in allowlist): `tests/unit/services/EmailService.test.ts`, `tests/unit/events/NotificationEventHandler.test.ts`.
**Verdict:** 5 jest→vitest migrations (B), all infra-free (Resend mocked); remove the `include` allowlist once ported so the suite stops being falsely green. Consider excluding the performance tier from the gate.

---

## Cross-service notes

- **Fragility / hardcoded endpoints:** portfolio integration+component dial
  `mongodb://localhost:27017` (no creds) and Kafka `9092` (infra is 9093);
  hardcoded `listen(3004)` collides across suites. shoot-service component relies
  on Docker/testcontainers, not the running localhost infra.
- **Setup smells:** shoot-service global `tests/setup.ts` (MongoMemoryServer +
  `mongoose.connect`) applies to the component file too and fights
  `component-setup.ts` → double connect / `dropDatabase requires authentication`
  on teardown. `mockFileModel` / `PortfolioModel` mocked as plain objects
  (jest-era) instead of `vi.fn()` constructors — recurs in file + portfolio.
- **False-green hazard:** notification-service `include` allowlist silently skips
  5 files; do not flip its CI gate on until they're ported and re-included.

## Suggested fix order (fast → structural)
1. **Quick test-data/mocks (B):** invitation token (1), portfolio repo mock (1),
   file-service `mockFileModel`/`PortfolioModel` constructor mocks.
2. **Migrations (B):** notification 5 files (drop the `include` allowlist),
   shoot integration import retarget.
3. **Testability refactors (C):** export `createServer()` in shoot / user /
   file-service `src/server.ts`; unblocks all three contract/integration suites.
4. **Source bugs (A):** file-service handler null-guard + date coercion; decide
   `photographerOnly` (A vs E).
5. **Infra/env fixes:** portfolio DSN creds + Kafka 9093 + `listen` isolation;
   shoot-service component Kafka decouple + double-connect cleanup (D).

## Per-service one-liners
- **shoot-service:** 1 B + 1 C + 1 D(+smell); 1 already-quarantined. Green without external infra once component is mocked.
- **user-service:** 1 C only. Green after `createServer()` extract.
- **invitation-service:** 1 B (64-char token). Trivially green.
- **portfolio-service:** 4 B (mock + DSN/port + listen). Green against the already-running local Mongo/Kafka after config fixes.
- **file-service:** ~8 B + 2 A + 1 (A/E) + 1 C. No external infra (Kafka mocked).
- **notification-service:** 5 B migrations; drop the `include` allowlist. No infra; exclude perf tier from the gate.
</content>
</invoke>
