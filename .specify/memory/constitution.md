<!--
## Sync Impact Report

- **Version change**: [PLACEHOLDER] → 1.0.0
- **Bump type**: MINOR — initial constitution fill; all five principles defined for the first time.
- **Modified principles**: N/A (initial fill — no prior named principles existed).
- **Added sections**:
  - I. Architecture-First
  - II. Clean Code
  - III. Simple UX
  - IV. Responsive Design
  - V. RESTful API Contract
  - Technology Stack
  - Development Workflow
  - Governance
- **Removed sections**: None (all template placeholders replaced).
- **Templates**:
  - `.specify/templates/plan-template.md` ✅ aligned — "Web app" structure option and
    Constitution Check section are compatible; no structural edits required.
  - `.specify/templates/spec-template.md` ✅ aligned — Mandatory requirements and success
    criteria sections are compatible with all five principles.
  - `.specify/templates/tasks-template.md` ✅ aligned — "Web app" path conventions
    (backend/src/, frontend/src/) match the React + .NET 10 stack.
  - `.specify/templates/agent-file-template.md` ✅ aligned — Generic structure; no conflicts.
  - `.specify/templates/checklist-template.md` ✅ aligned — Generic structure; no conflicts.
- **Follow-up TODOs**: None — all placeholders resolved.
-->

# ReadyWealth Constitution

## Core Principles

### I. Architecture-First

Every feature MUST begin with a documented architecture review before any implementation work
starts. The system is organized into three clearly separated layers: React frontend,
RESTful .NET 10 API, and data/persistence. These boundaries MUST be respected at all times —
no business logic in the frontend, no presentation logic in the backend.

**Non-negotiable rules**:

- An architecture diagram, ADR, or design document MUST be produced and reviewed before
  Phase 1 implementation begins (enforced via Constitution Check in `plan.md`).
- Frontend, API, and data-layer responsibilities MUST not bleed across boundaries.
- Cross-cutting concerns (authentication, logging, error handling, validation) MUST be
  designed as shared infrastructure, not implemented as per-feature patches.
- Introducing a new runtime, framework, or persistence technology requires a formal ADR
  and an amendment to this constitution.

**Rationale**: Architectural decisions made late are expensive to reverse. Early design clarity
prevents tight coupling, enables parallel development, and keeps the system understandable
as it grows.

### II. Clean Code

All code MUST be readable, self-documenting, and maintainable by any team member without
requiring the original author to explain it.

**Non-negotiable rules**:

- Names (variables, methods, classes, endpoints) MUST clearly convey intent. Abbreviations
  and single-letter identifiers are NOT permitted outside of loop counters.
- Every function or method MUST do exactly one thing (Single Responsibility Principle). A
  function that needs a comment to explain what it does MUST be refactored.
- Code duplication is NOT permitted. Shared logic MUST be extracted to a common service,
  utility, or library.
- Dead code MUST be deleted — commenting out code is not an acceptable substitute for
  version control history.
- Magic numbers and inline string literals MUST be replaced with named constants or
  configuration values.

**Rationale**: Clean code reduces the cost of every future change and review. It is not
an aesthetic preference — it is a maintenance and safety requirement.

### III. Simple UX

Every user interface element MUST serve a demonstrable user need. Complexity is the enemy
of adoption. Features that exist because they are technically possible — not because users
need them — MUST NOT be built.

**Non-negotiable rules**:

- No UI element may be added without a corresponding user story that justifies it.
- Default states, loading states, and error states MUST be designed for every interactive
  component before implementation begins.
- Primary user flows MUST be completable in the fewest possible steps. Any flow requiring
  more than five steps MUST be justified with a product decision documented in the spec.
- UI copy and labels MUST use the language users employ, not internal technical terminology.
- Error messages MUST explain what went wrong and what the user can do next — no raw
  exception messages or HTTP status codes exposed in the UI.

**Rationale**: Simplicity drives adoption and reduces support burden. Every unnecessary
interaction is a friction point that erodes user confidence.

### IV. Responsive Design

All UI components MUST render correctly and remain fully usable across mobile (≥320 px),
tablet (≥768 px), and desktop (≥1024 px) viewports. Responsive behavior is a first-class
requirement, not a post-release enhancement.

**Non-negotiable rules**:

- Development MUST follow a mobile-first approach: base styles target mobile viewports;
  progressive enhancements target larger breakpoints.
- Primary container layouts MUST NOT rely on fixed pixel widths.
- Interactive touch targets MUST be at least 44×44 px.
- Typography MUST scale appropriately across breakpoints. No text that requires horizontal
  scrolling on any supported viewport is acceptable.
- Responsive behavior MUST be verified on all three breakpoint tiers (mobile, tablet,
  desktop) before a feature is marked complete.

**Rationale**: ReadyWealth users access the application from a variety of devices. A layout
that only works on desktop excludes a significant portion of the target audience.

### V. RESTful API Contract

The .NET 10 backend MUST expose all data and operations through RESTful HTTP endpoints.
The API contract is the single source of truth for frontend–backend communication and MUST
be defined before frontend implementation begins.

**Non-negotiable rules**:

- All endpoints MUST follow REST conventions: correct HTTP verbs (GET / POST / PUT /
  PATCH / DELETE), resource-based URLs (nouns, not verbs), and standard HTTP status codes.
- OpenAPI / Swagger documentation MUST be generated and kept current. It MUST be reviewed
  alongside the plan before frontend work starts.
- APIs MUST be versioned from the first release (e.g., `/api/v1/`). Breaking changes
  require a version bump — no silent contract modifications.
- Request and response payloads MUST be documented. Undocumented fields are NOT permitted
  in production responses.
- Authentication and authorization MUST be enforced at the API layer. Frontend-only
  access control is NOT acceptable.

**Rationale**: A stable, documented contract decouples frontend and backend development,
enables independent testing, and prevents integration surprises.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (TypeScript), component-based SPA |
| Backend | .NET 10, ASP.NET Core Web API |
| API Protocol | HTTP/REST, JSON payloads, OpenAPI/Swagger |
| Frontend Testing | Vitest or Jest |
| Backend Testing | xUnit; integration tests MUST cover API contracts |
| Target Platforms | Modern browsers (Chrome, Firefox, Edge, Safari); responsive across mobile, tablet, desktop |

All technology choices MUST align with this stack. Any deviation requires a formal ADR
and an amendment to this constitution.

## Development Workflow

Features MUST progress through the following stages in order:

1. **Specify** (`speckit.specify`): Write or update the feature spec — user stories with
   priorities, acceptance criteria, and measurable success criteria.
2. **Plan** (`speckit.plan`): Produce an architecture and implementation plan. The
   Constitution Check gate MUST pass before Phase 0 research ends and again after
   Phase 1 design.
3. **Task** (`speckit.tasks`): Generate dependency-ordered tasks organized by user story.
4. **Implement** (`speckit.implement`): Execute tasks and commit after each logical unit.
5. **Validate**: Each user story MUST be independently testable at its checkpoint. Do
   not advance to the next story until the current one passes validation.

Code review MUST verify compliance with all five Core Principles before any merge.

## Governance

This constitution supersedes all informal practices, Slack agreements, and undocumented
conventions. When in conflict, this document wins.

**Amendment procedure**:

1. Open a PR with the proposed change to `.specify/memory/constitution.md`.
2. Document the rationale and version bump type (MAJOR / MINOR / PATCH) in the PR
   description using the versioning policy below.
3. Obtain approval from at least one team member before merging.
4. Run `/speckit.constitution` after merge to propagate changes to dependent templates
   and generate an updated Sync Impact Report.

**Versioning policy**:

- **MAJOR**: Backward-incompatible changes — principle removals or redefinitions that
  invalidate existing plans or implementations.
- **MINOR**: New principles, new mandatory sections, or materially expanded guidance.
- **PATCH**: Wording clarifications, typo fixes, and non-semantic refinements.

**Compliance review**: Every plan (`speckit.plan`) MUST include a Constitution Check
section that explicitly verifies each of the five Core Principles. Any deviation MUST
be documented in the Complexity Tracking table with a clear justification.

**Version**: 1.0.0 | **Ratified**: 2026-03-02 | **Last Amended**: 2026-03-02
