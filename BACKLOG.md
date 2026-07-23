# Backlog

The prioritized list of stories to implement. Complementary to the roadmap
(`ROADMAP.md` / the `*_roadmap.md` planning docs): the roadmap sets direction and
phases; this backlog is the actionable, groomed story list.

Ownership and permissions are defined in `GOVERNANCE.md`.

Status legend: `TODO` · `IN PROGRESS` · `DONE` · `SKIPPED`
Priority: `P1` (do now) · `P2` (soon) · `P3` (later)

---

## Inputs to triage

- **QA findings** live in `docs/QA-Findings/`. The product owner triages relevant
  findings into prioritized stories below. Current open set:
  `docs/QA-Findings/2026-07-e2e-audit.md` (QA-1..QA-8) — the P1 items block
  deterministic E2E runs and are being addressed as part of the E2E hardening
  work.

---

## Stories

_(Product-owner-groomed stories go here — e.g. frontend↔backend wiring, client
gallery access, guest permissions, and triaged QA findings. To be populated.)_

- `TODO` `P3` **Unify the HTTP response envelope across services.** shoot-service
  returns error bodies as `{ code, message }` and health as `{ status: 'ok',
  service }`, whereas user-service (canonical) uses `{ error, message,
  statusCode }` and a health body with a `status` enum + `timestamp`. WS2
  realigned the shoot contract test to the actual shoot API to get the tier
  green; the real fix is to make shoot-service's handlers/health match the
  user-service canonical envelope and then restore the stricter contract-test
  assertions.
