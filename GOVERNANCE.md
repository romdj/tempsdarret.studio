# Agent Governance

Single source of truth for **who may do what** across the roadmap, backlog,
codebase, tests, and delivery. Agent definitions (`.claude/agents/*.md`) point
here rather than restating ownership, so policy lives in one auditable place.

**Authority:** if an agent definition and this document disagree on ownership or
permissions, **this document wins**. Scope decisions that aren't covered here
escalate to the human.

---

## Roles

| Role (agent) | Mandate | Tools (enforced capability) |
|---|---|---|
| **product-owner** | Direction, requirements, prioritization | Read, Grep, Glob, Write |
| **qa-auditor** | Independent review; authors QA findings | Read, Grep, Glob, Bash, Write |
| **fullstack-developer** | Implement features/fixes across the stack | Read, Write, Edit, Grep, Glob, Bash |
| **test-developer** | Author/maintain automated tests (TDD) | Read, Write, Edit, Grep, Glob, Bash |

The tool column is the **mechanical** boundary (the harness blocks tools an agent
doesn't have). The RACI below is the **policy** the tools + hooks + git enforce.

---

## RACI — artifacts & decisions

**R**esponsible (does the work) · **A**ccountable (owns the outcome, sign-off) ·
**C**onsulted (input before) · **I**nformed (told after).

| Artifact / decision | product-owner | qa-auditor | fullstack-dev | test-dev |
|---|---|---|---|---|
| `ROADMAP.md` / `*_roadmap.md` | **A/R** | I | C | I |
| `BACKLOG.md` (product stories) | **A/R** | C | C | C |
| `docs/QA-Findings/**` | I | **A/R** | I | I |
| Application source (`services/**`, `packages/**`, `frontend/**`) | I | C (audits) | **A/R** | C |
| Automated tests (`**/tests/**`, `*.test.ts`) | I | C (audits) | C | **A/R** |
| CI/CD config (`.github/**`, compose, infra) | C | C | **A/R** | C |
| `GOVERNANCE.md` / agent defs | A (with human) | C | C | C |
| Merge to `main` / release | A | C | R | I |

---

## Policies

**Separation of duties.** The qa-auditor authors its findings in
`docs/QA-Findings/` but is **read-only toward what it audits** — it does not edit
application code, tests, or `BACKLOG.md`. The **product owner** reads the findings
and triages the relevant ones into `BACKLOG.md` as prioritized stories. Each role
writes its own artifacts; none edits another's.

**Least privilege.** An agent gets only the tools its mandate needs. This is
enforced by the harness (tool allowlist), not by trust.

**Write scopes (policy — not hook-enforced at current team size).**
- product-owner writes `ROADMAP.md`, `BACKLOG.md`, `docs/**` — not code.
- qa-auditor writes only `docs/QA-Findings/**` — nothing it audits.
- developers write code/tests/CI; they do not unilaterally rewrite the roadmap.
- Anyone may *read* anything.

**Delivery.** Conventional Commits with a valid scope (see
`commitlint.config.js`); logical multi-commits; branch off `main` for feature
work; all commits to `main` pass CI; never `--no-verify`. Merge to `main` is
accountable to the product owner.

**Escalation.** Genuine scope/priority decisions, or anything not covered here,
go to the human — agents don't invent policy or requirements.

---

## Enforcement model (defense in depth)

Layered, weakest → strongest:

1. **Tool allowlist** (each agent def) — controls whether an agent can write/edit
   *at all* (e.g. auditor has no `Edit`; only `Write` for its findings).
2. **`settings.json` permissions** — deny dangerous operations.
3. **PreToolUse hooks** — path/role-aware blocking (e.g. "only fullstack-dev may
   Edit `services/**`"). The mechanism for *hard* path scopes.
4. **Git-level** — branch protection + `CODEOWNERS` + the existing husky
   pre-commit/commit-msg hooks enforce the merge gate regardless of agent.

**Active at current team size (solo, pre-launch):** layers **1** (tool
allowlists) and the **husky hooks** from layer 4 — good practice at ~zero cost.
Write-scopes above are **policy**, not mechanically enforced.

**Upgrade trigger:** when a second contributor joins or the project nears a real
user/customer, enable layer-4 branch protection + `CODEOWNERS`, then consider
layer-3 hooks for hard path scoping. Not worth the effort before then.
