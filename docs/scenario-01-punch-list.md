# Scenario 01 — Shoot Creation + Client Invitation
## Pre-implementation Punch List

Captures every gap surfaced while sketching screens A–E (admin create-shoot form, admin shoot detail, client magic-link landing, client gallery, invite email). Each item is tagged so you can sequence work:

- **`blocking`** — the affected screen cannot ship until this is resolved
- **`degradable`** — the screen ships, but with a known compromise (e.g. user refreshes instead of getting real-time updates)
- **`defer-v2`** — clearly post-MVP; do not let it block scenario 01

Each item ends with a **one-line recommendation** — the call I'd make if asked.

---

## A. Decisions to make before any code

These are not coding tasks. They're calls that determine what gets built.

### A1. Magic-link expiry semantics  `blocking`
ADR-003 declares a 15-minute magic-link expiry. That's fine for "verify your email" flows but wrong for "view your photos" — emails get queued, opened next morning, the link is dead. Industry practice for delivery emails is days-to-weeks first-click validity, then a normal session JWT post-click.
**Recommendation:** amend ADR-003 to differentiate (a) first-click token validity (7 days) from (b) post-click session JWT lifetime (existing 15 min is fine if backed by refresh). Without this, the invite email cannot promise anything truthful.

### A2. Draft-shoot status  `blocking`
Screen A's auto-save-on-first-interaction (so uploads can start before the form is saved) requires `status: 'draft'` on shoots. Today the Zod schema only allows `planned | in_progress | completed | delivered | archived`.
**Recommendation:** add `draft` to `ShootStatusSchema` + add a background sweeper that purges drafts older than 7 days. Small ADR or just a schema PR — your call which it needs.

### A3. Schema vs spec drift  `degradable`
`shoot-service.md` describes a rich model (category, client.name, client.phone, client.company, isPublic, isFeatured, allowDownloads, status, tags). The Zod schema in `packages/shared/src/schemas/shoot.schema.ts` only has title, clientEmail, photographerId, scheduledDate, location.
**Recommendation:** trim the spec to match the schema for scenario 01. Re-introduce richer fields per concrete user need, one at a time. The personalised email greeting ("Hi Emma") needs at minimum a `clientName` — add that. The rest can wait.

### A4. Token-carries-shootId for direct redirect  `degradable`
After validation, frontend redirects to `/client/galleries` (the list). For a single-shoot client (the common case), the list is friction — they want their photos.
**Recommendation:** include `shootId` in the magic-link token payload; redirect target becomes `/galleries/[shootId]`. If client has multiple active shoots, fall back to the list. One backend change; one frontend redirect change.

---

## B. invite-service

### B1. Distinct error codes on magic-link validation  `blocking` (for screen C)
Current handler returns `{ success: false, error: error.message }` and the frontend uses `message.includes('expired')` heuristics to differentiate. To render four distinct error UIs (expired / used / invalid / server-error), we need explicit codes.
**Recommendation:** return `{ success: false, code: 'EXPIRED' | 'USED' | 'INVALID', message: string }` from `GET /magic-link/:token`. The frontend switches UI on `code`, falls back to "we can't open this link" for unknowns.

### B2. Self-serve resend endpoint  `degradable`
Screen C (expired) shows an email field + "Send link" button so the client doesn't have to chase the photographer. Today there's no endpoint backing it.
**Recommendation:** `POST /invites/resend { email }`. Looks up the latest non-archived shoot the email is associated with, mints a new magic-link, fires it through notification-service. Rate-limit per email (3/hour). Without this, screen C falls back to a contact button — not blocking, but increases the support load proportional to expired-link incidents.

### B3. Event enrichment: invitation.sent → clientName + shootTitle  `blocking` (for screen E)
The email template needs "Hi Emma" and "your photos from Smith Wedding". Today the `invitation.sent` event carries `invitationId`, `shootId`, `clientEmail` — but no name or shoot title. Notification-service would have to make a synchronous call back to shoot-service to fetch them, which violates the event-driven contract.
**Recommendation:** enrich `invitation.sent` at source — invite-service already has the shoot lookup to mint the link; include `clientName` and `shootTitle` in the published event payload.

---

## C. shoot-service

### C1. Auto-status transitions on events  `degradable`
Screens B and D rely on status: B shows the pill, D's empty state differs per status. The spec describes `planned → in_progress → completed → delivered → archived` driven by milestones (first photo uploaded, archive downloaded). Today nothing auto-transitions.
**Recommendation:** subscribe to `file.uploaded` (→ `in_progress`), `archive.downloaded` (→ `delivered`). Single consumer per transition. Without it, the status pill is a manual photographer task.

### C2. Consume auth.project-accessed for "last accessed"  `degradable`
Screen B shows "Last accessed: never" or a timestamp. Spec references `auth.project-accessed` event; nothing consumes it.
**Recommendation:** add a consumer that updates the shoot's `status.lastClientAccess` field. Nice-to-have. Without it, "Last accessed" is hidden from the UI.

### C3. Add clientName to the shoot schema  `blocking` (for screens A, B, D, E)
Personalised greetings need a name. The Zod schema has only `clientEmail`. Form A asks for both; backend rejects the name field today.
**Recommendation:** extend `CreateShootRequestSchema` with `clientName: z.string().min(1).max(100).optional()`. Surface in `Shoot`. Used by all client-facing UI + the email template.

---

## D. file-service

### D1. RAW conversion pipeline runtime  `blocking` (for the photos to ever appear)
Spec defines 4 variants (`original` / `high` / `medium` / `thumb`) via sharp. README claims background processing. Code is partial — supports RAW formats (CR2, CR3, NEF, ARW) + sidecars (XMP, COS) on the storage side, but the per-variant generation runtime isn't fully wired.
**Recommendation:** finish the sharp-based processor pipeline that produces all 4 variants and emits `file.processing-completed` per file. Without this, uploaded RAWs sit there unprocessed and screens B + D show nothing.

### D2. Real-time progress channel (file.processing-completed → admin UI)  `degradable`
Screens A (upload side panel) and B (live progress bar + thumbnails-as-they-arrive) want server-pushed updates as variants are generated. Kafka publishes the event; no path to the browser exists.
**Recommendation:** add SSE endpoint at the api-gateway level — `GET /events/admin/shoots/:shootId/stream` — that consumes Kafka topics relevant to that shoot and forwards them. Auth via JWT cookie. Skip WebSockets unless you need bidirectional. Without it, screens A + B fall back to "refresh to see progress" copy — degraded but shippable.

### D3. Bulk archive packaging runtime  `defer-v2`
Screen D's "Download all" buttons promise ZIP archives of high-quality JPEGs and (worse) the originals. RAW archives are tens of GB; building a streaming archive service is its own project. README mentions an `ArchiveService` but it's not runtime.
**Recommendation:** hide "Download all (RAW)" until a real archive runtime exists. Keep "Download all (JPEG)" as a button that returns "coming soon" or remove. Per-photo download already covers MVP need.

---

## E. notification-service

### E1. Unblock from Payload CMS migration  `blocking` (for screen E)
The service has its build skipped pending a Payload CMS decision. Until that lands, no email goes out. Without email, the entire scenario stops at "shoot saved" — no invite, no client landing, no gallery view.
**Recommendation:** make the Payload-vs-not call this week. If Payload is the answer, time-box the migration. If not, restore the build with a templating library (handlebars or a simple string substitution layer) and unblock everything downstream.

### E2. Email template wiring  `blocking` (for screen E)
Once the build is unblocked, the actual `invitation.sent` consumer needs to render the template designed in screen E and ship via Resend.dev.
**Recommendation:** plain-text template alongside the HTML one. Send both via Resend's `react`/`text` fields. Subject line: `"Your photos from {shootTitle} are ready 📷"`.

---

## F. frontend / BFF / api-gateway

### F1. Magic-link route mismatch  `blocking` (for screen C)
Frontend `+page.server.ts` does `POST http://localhost:8000/api/auth/magic-link/validate` with token in body. Backend handler is `GET /magic-link/:token`. The wiring is broken.
**Recommendation:** align on `GET /api/invites/magic-link/:token` (versioned + scoped), update both sides. Hard-coded `localhost:8000` also wants to move to an env var.

### F2. BFF endpoint for client gallery view  `blocking` (for screen D)
Screen D needs shoot title, shoot date, gallery + photos in one render. Today the frontend would make N round-trips. No BFF endpoint stitches them.
**Recommendation:** `GET /api/client/shoots/:shootId/view` returns `{ shoot: {title, scheduledDate, photographerId}, gallery: {totalPhotos, processedCount}, photos: [{id, thumbUrl, mediumUrl, status}] }`. JWT-authenticated. One request → one render. Kong routes the call to either a thin BFF service or stitches at gateway level.

### F3. SSE channel via api-gateway  `degradable`
Same channel as D2 from the gateway perspective — Kong needs to proxy a Server-Sent-Events route.
**Recommendation:** Kong supports SSE pass-through with the right `buffering` config. Document the route in `api-gateway/kong.yaml`. If real-time slides to v2, this also slides.

### F4. Persistent upload side panel + beforeunload guard  `blocking` (for screen A's upload UX)
The Google-Drive-style panel that survives in-app navigation and warns on close. Lives in `(admin)/+layout.svelte`. Svelte store for upload state. Per-file lifecycle (queued → uploading → processing → ready/failed). `beforeunload` only fires the prompt when uploads are active.
**Recommendation:** build it once; reuse across any admin page that uploads. State store keyed by shootId so navigating between shoots doesn't conflate progress.

### F5. Folder upload via webkitdirectory  `degradable`
`<input type="file" webkitdirectory>` works in Chrome/Edge/Safari, not Firefox. Admins likely use one of the first three; acceptable.
**Recommendation:** ship as-is, show a "Firefox users: please select files instead" hint conditionally.

### F6. Magic-link page: render four distinct error states  `blocking` (for screen C, depends on B1)
Currently one card for all errors.
**Recommendation:** rewrite `+page.svelte` to switch on `data.code`. Each state matches the sketches: expired (with email resend form), used (with new-link CTA), invalid (with contact CTA), server-error (with retry).

### F7. Client gallery: empty + partial + full states  `degradable`
Existing page only handles "loading / error / loaded with photos / loaded empty". Doesn't distinguish "photographer is still uploading" from "this gallery is genuinely empty".
**Recommendation:** read shoot status from the BFF (F2). Render the empty-state copy when `status === 'planned'` and `photos.length === 0`. Render partial when `processedCount < totalUploadCount`. Render full when processing complete.

### F8. Admin form: auto-save shoot as draft  `blocking` (for screen A's "upload while filling")
Tied to A2. Frontend does `POST /shoots { status: 'draft' }` on first form interaction (debounced), keeps the resulting shootId in state for upload routing, then `PATCH` on save to promote to `planned`.
**Recommendation:** implement after A2 lands. Until then, the form ships as save-first-then-upload — less ideal but functional.

---

## G. Suggested sequence

**Phase 0 — Decisions only (no code, ~1 day):**
A1 (expiry) · A2 (draft status) · A3 (schema trim) · A4 (token shootId) · E1 (Payload call).

**Phase 1 — Critical-path unblockers (~3-5 days):**
C3 (clientName) · B1 (error codes) · B3 (event enrichment) · D1 (RAW pipeline) · E1+E2 (notification unblock + template) · F1 (route fix) · F2 (BFF endpoint).

**Phase 2 — Implement the screens (~3-4 days):**
F6 (magic-link UI) · F7 (gallery states) · A2-driven form + F8 (auto-save draft) · F4 (upload side panel).

**Phase 3 — Degradations to real-time (~2-3 days):**
D2 (SSE) · F3 (Kong) · C1 (auto-status) · B2 (resend endpoint).

**Phase 4 — Polish and engagement features (post-MVP):**
C2 (last accessed) · D3 (bulk archive) · favourites · download tracking.

Phases 0-2 ship a functional scenario 01. Phase 3 turns it from "works" into "feels alive". Phase 4 is the long tail.

---

## H. What gets cut to ship faster

If the calendar gets tight, here's the ordered slack list. Each cut degrades but doesn't break:

1. **Cut D3 (bulk archive).** Per-photo download covers MVP need. -3 days.
2. **Cut D2 + F3 (real-time SSE).** Client refreshes, admin refreshes. Annoying but functional. -2 days.
3. **Cut B2 (self-serve resend).** Expired-link clients hit "Contact photographer" instead. Increases support load proportionally. -1 day.
4. **Cut F4 (persistent side panel).** Uploads block the form. Slower workflow, but the photographer can wait. -1.5 days.
5. **Cut A2 + F8 (draft auto-save).** Photographer fills form first, then uploads. Workflow degraded; nothing broken. -1 day.

Total possible compression: ~8.5 days. Floor for "scenario 01 minimally works" is phase 0 decisions + phase 1 unblockers + the screen implementations of magic-link landing and gallery — roughly a 6-8 day floor.
