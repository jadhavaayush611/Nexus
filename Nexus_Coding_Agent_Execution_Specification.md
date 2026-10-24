<!-- Converted from Nexus_Coding_Agent_Execution_Specification.docx. This Markdown file preserves the specification's content and structure. -->

Implementation Blueprint and Coding-Agent Execution Specification

SIH 2026 | PS SIH26264

Purpose: authoritative build contract for coding agents. Implement the defined scope only. Use synthetic records only; do not claim production integration. The team has four active developers and limited prior experience, so favour a small, testable, polished product over broad unreliable features.

## 1. Product definition

Build an institution-centred complaint coordination dashboard for the workflow described in PS SIH26264. It helps an operator see complaints across bureaus/cells, identify potentially related cases despite differing references or wording, inspect the evidence, review the suggestion, and track ownership, next action and history.

Working name: Nexus (provisional; check name availability). Promise: “Connect the evidence. Keep the cases distinct. Make every decision explainable.” This is a synthetic-data prototype, not an official AICTE product.

## 2. Differentiation strategy — required

- Explainable cross-bureau case linking: every suggested relationship shows actual evidence such as institution identity, reference/metadata signals, category/date proximity and text similarity.
- Institution-centred case context: show separate complaints, bureau ownership, status, next action and chronology under one institution profile.
- Human-in-the-loop review: confirm, dismiss or request more information; dismissal requires a reason; decisions appear in an audit timeline.
- False-positive-aware matching: same institution alone is insufficient; similar text alone is insufficient. A relationship never merges or closes complaints.
- Evaluation with labelled synthetic positive pairs and hard negatives; report precision, recall, F1 and confusion counts honestly.
- Signature review workspace with clear hierarchy, evidence panel, keyboard-friendly actions, and loading/empty/error states.
Do not claim global novelty. The defensible USP is the integrated operational execution: explainable cross-bureau, institution-centred linking with human review, traceability and measured false-positive behaviour.

## 3. Fixed scope

### 3.1 P0 — must build

- Overview dashboard: open cases, relationships awaiting review, overdue next actions, and potential cross-bureau links. All counts must come from the database.
- Synthetic institution directory/profile with canonical names, identifiers and aliases.
- Complaint register with search and filters for bureau, status, category, institution, dates and review state.
- Complaint detail: reference, institution, bureau, category, description, submitted date, status, assigned role/officer label, next action/due date, audit timeline and related-case panel.
- Deterministic matching service combining institution identity, reference/metadata, category/date signals and TF-IDF/cosine text similarity. Keep weights and thresholds centrally configured.
- Evidence panel explaining each calculated signal; use score bands High / Review / Weak rather than presenting a score as truth.
- Relationship actions: Confirm related, Dismiss suggestion, Needs more information. Require a reason for dismissals.
- Keep complaint records separate. Never auto-merge, auto-close, or automatically transfer/assign cases.
- Audit events for imports, match generation, relationship decisions and important case changes.
- CSV import with row-level validation errors, one-click Load Demo Dataset, deterministic reset, synthetic data fixtures, automated tests and a complete README.

### 3.2 P1 — only after P0 is stable

- Compact institution relationship map with accessible list/timeline fallback.
- Due-soon/overdue indicators and filters.
- Export filtered synthetic case summaries to CSV.
- Evaluation page showing hard-negative examples and benchmark metrics.

### 3.3 Explicitly out of scope

- Live AICTE/CPGRAMS integration, official authentication, real complaint/personal data or production deployment.
- Automatic complaint merging, closure, transfer or assignment based on similarity.
- Custom-trained model, paid APIs, generative-AI dependency or external embeddings.
- Kubernetes, microservices, distributed queues or unnecessary cloud infrastructure.
- Claims that the tool determines complaint validity, detects fraud, guarantees duplicates or replaces human review.

## 4. Recommended stack and repository

| Layer | Decision | Reason |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | Fast local development and typed UI. |
| Styling | Tailwind CSS or existing consistent styling | Reusable tokens; avoid several competing UI libraries. |
| Backend | Python + FastAPI | Readable API and straightforward validation/testing. |
| Database | SQLite + SQLAlchemy | Persistent local demo without infrastructure. |
| Matching | Python rules + scikit-learn TF-IDF/cosine similarity | Local, explainable baseline. |
| Tests | pytest; frontend tests for critical flows if feasible | Repeatable quality checks. |
| Data | Versioned synthetic CSV/JSON | Repeatable demo and evaluation. |

Suggested folders: frontend/; backend/app/main.py; backend/app/models.py; backend/app/schemas.py; backend/app/services/matching.py; backend/app/services/audit.py; backend/app/routers/; backend/tests/; data/demo/; docs/. Inspect the existing repository first and preserve working code. Do not change the stack without team approval.

## 5. Data model and matching rules

| Entity | Minimum fields |
| --- | --- |
| Institution | id, canonical_name, normalized_identifier, aliases, optional region/type; synthetic only. |
| Complaint | id, external_reference, institution_id nullable, institution_name_raw, bureau, category, description, submitted_at, status, assigned_role, next_action, due_at, created_at, updated_at. |
| Relationship | id, complaint_a_id, complaint_b_id, score, score_band, evidence_json, state (suggested/confirmed/dismissed/needs_info), reviewer_reason, reviewed_by_demo_role, timestamps. Unique pair regardless of order. |
| AuditEvent | id, entity_type, entity_id, event_type, actor_demo_role, occurred_at, details_json; append-only in application logic. |
| ImportJob (optional) | id, filename, row_count, accepted_count, rejected_count, created_at, validation_summary. |

Suggested signals: institution identifier/verified alias (strong); exact or related reference information (strong when applicable); category compatibility; date proximity; TF-IDF description similarity; bureau difference as context only. Different references do not block a relationship. Same institution or similar text alone must not create a high-confidence match. Exclude self-pairs and duplicate pair order. Every explanation must be derived from actual values.

## 6. Requirement mapping

| Problem/operator need | Feature | Acceptance evidence |
| --- | --- | --- |
| Central institution profile | Institution directory/profile | Shows all institution complaints, aliases and chronology. |
| Cross-bureau visibility | Bureau badges, filters, profile | Demo institution has records across at least two bureaus. |
| Reference/status/owner/next action | Register and detail page | Every seeded complaint shows these fields. |
| Overlap despite different references | Explainable matching | A labelled positive pair with different references is surfaced with evidence. |
| Avoid false duplicate assumptions | Human review + hard negatives | Same institution/unrelated issue is not auto-merged; reviewer can dismiss. |
| Chronology and accountability | Audit timeline | Review and case changes create timestamped events. |
| Dashboard, filters, alerts, analytics | Data-derived metrics and due indicators | Counts and filters match current database state. |
| Feasible student prototype | Local stack and synthetic import | Fresh setup works without external services. |

## 7. Minimum API contract

| Route | Purpose |
| --- | --- |
| GET /api/health | Health check/version. |
| GET /api/dashboard/summary | Summary counts and due-action counts. |
| GET /api/institutions; GET /api/institutions/{id} | List/search and profile. |
| GET /api/complaints | Filtered, paginated complaint list. |
| POST /api/complaints; GET/PATCH /api/complaints/{id} | Create, view and update a complaint; updates produce audit events. |
| GET /api/relationships | Filter relationships by state/bureau/institution. |
| POST /api/relationships/{id}/review | Confirm/dismiss/needs-info; validate transition and dismissal reason. |
| POST /api/import/demo | Reset/load deterministic synthetic data. |
| POST /api/import/csv | Validate/import CSV and return row-level errors. |
| GET /api/evaluation/summary | Metrics from labelled synthetic pairs. |
| GET /api/export/complaints.csv (P1) | Export filtered synthetic complaints. |

Use consistent JSON shapes and meaningful HTTP status codes. Frontend errors must be understandable; do not return stack traces to users.

## 8. Visual and interaction contract

- Design direction: calm operations console, not a generic admin template. Neutral canvas, dark readable text, one restrained accent, semantic status colours and consistent spacing.
- Navigation: Overview, Institutions, Complaints, Relationship Review, Evaluation & Method.
- Signature screen: review queue on one side, two case summaries in the centre, evidence panel and distinct review actions on the other.
- Every screen has loading, empty, error and success states. All visible controls work.
- Use keyboard focus, semantic labels, readable contrast and do not rely on colour alone.
- Label synthetic/demo data in the UI. Avoid neon gradients, glassmorphism, meaningless charts, fake AI chat panels and hardcoded counts.

## 9. Four-contributor ownership

| Owner | Leads | Deliverables |
| --- | --- | --- |
| A — Backend/persistence | FastAPI, schema, SQLite, CRUD, audit, import/reset | Working APIs, validation, tests and setup notes. |
| B — Matching/evaluation | Normalization, scoring, evidence, labelled benchmark | Pure testable matcher, documented thresholds, hard-negative evaluation. |
| C — Frontend/design | Navigation, dashboard, institution/complaint views, review UI | Responsive accessible UI connected to actual API data. |
| D — Integration/data/QA | Synthetic fixtures, CSV contract, end-to-end tests, docs/demo | Repeatable dataset, test checklist, bug triage, demo script. |

Agree on field names, status vocabulary, route contracts and visual tokens before parallel work. Developer D owns integration continuously, not only at the end. Each contributor commits small changes and runs relevant tests.

## 10. Phased execution plan and exit gates

### Phase 0 — Freeze contracts

- Agree stack, schema, statuses, endpoints, design tokens and CSV format.
- Create 8–12 synthetic institutions, 30–50 complaints, at least 10 labelled positive pairs and 15 hard negatives.
Exit: all contributors can explain the data contract; no ambiguous fields.

### Phase 1 — Runnable skeleton

- Backend starts, creates SQLite tables and answers /api/health.
- Frontend starts and displays real backend health.
- Document one repeatable test command.
Exit: clean checkout starts from README.

### Phase 2 — Data flow

- Build complaint/institution CRUD, filters, seed/reset and dashboard aggregates.
- Connect list/detail screens to API; add validation and user-visible errors.
Exit: search, filter, view and update work; changes persist.

### Phase 3 — Explainable matching

- Implement normalization, candidate scoring and evidence payload.
- Make relationship generation idempotent; evaluate positive and hard-negative pairs; tune thresholds.
Exit: each suggestion has real evidence; tests and metrics are available.

### Phase 4 — Review and audit

- Implement confirm/dismiss/needs-info and required dismissal reason.
- Record and display audit events; ensure dismissed links do not reappear as fresh pending suggestions unexpectedly.
Exit: decisions persist after restart and history distinguishes suggestions from human decisions.

### Phase 5 — Visual polish

- Finish institution profile, review workspace, filters, due indicators and responsive states.
- Test keyboard navigation and empty/error states; add P1 only if P0 is stable.
Exit: every visible control works and data is real.

### Phase 6 — Stabilization

- Test missing IDs, duplicate references, unrelated same-institution cases, similar text across institutions, import errors and persistence.
- Fix critical defects and document results/known limits.
Exit: all P0 acceptance tests pass; no critical blocker.

### Phase 7 — Demo packaging

- Freeze a known-good commit and dataset; rehearse a maximum five-minute demo.
- Verify clean setup and prepare fallback recording/screenshots.
Exit: a teammate can run the demo without hidden setup steps.

## 11. Required acceptance tests

| ID | Input | Expected |
| --- | --- | --- |
| T01 Cross-bureau positive | Same institution; different references; compatible category/date and related descriptions. | Suggested relationship with actual evidence. |
| T02 Same institution, unrelated topics | One institution, unrelated issues. | No automatic merge; no unjustified high-confidence link. |
| T03 Similar text, different institution | Near-identical descriptions, different IDs. | Institution mismatch prevents high-confidence link. |
| T04 Missing ID | Raw institution name only. | Uncertainty/manual review; no fabricated identity. |
| T05 Dismissal | Reviewer dismisses a suggestion. | Reason required; event persists. |
| T06 Confirmation | Reviewer confirms link. | Both complaints remain separate; decision/time visible. |
| T07 Bad CSV | Missing columns or malformed dates. | Row-level errors; accepted data not corrupted. |
| T08 Persistence | Edit/review, restart services. | Records and decisions persist. |
| T09 Metrics integrity | Reset and reload data. | Dashboard and evaluation recalculate. |
| T10 Backend failure | Stop backend or return empty data. | UI shows clear error/empty state. |

## 12. Five-minute demo script

1. 0:00–0:25 — Explain the cross-bureau visibility and differing-reference problem.
1. 0:25–1:00 — Open a synthetic institution profile with cases across two bureaus.
1. 1:00–1:50 — Open a suggested relationship and explain the calculated evidence.
1. 1:50–2:35 — Confirm it; show separate records and audit event.
1. 2:35–3:15 — Dismiss a plausible false match with a reason.
1. 3:15–4:10 — Show filters, next actions, due state and chronology.
1. 4:10–4:45 — Show metrics from labelled synthetic pairs.
1. 4:45–5:00 — State limits: synthetic data, no live integration, human reviewer retains authority.

## 13. Coding-agent operating instructions

1. Read this document before coding. Treat scope, data model, API, visual contract and acceptance tests as binding.
1. Inspect the repository first. Preserve working code and avoid unrelated rewrites.
1. Before each task, state files to change, assumptions and tests; then implement the smallest coherent change.
1. Never create fake endpoints, hardcoded metrics, dead buttons, fabricated test results or placeholders represented as complete.
1. Do not change stack, schema, routes or statuses without documenting the reason and getting team approval.
1. Use synthetic data only; no external service or API key is needed.
1. After each task, report exact commands, test pass/fail counts, files changed and known gaps. Never claim unrun tests passed.
1. Write beginner-readable code with types, small functions, useful comments and updated README.
1. Prioritize P0 completion and demo reliability over P1.

## 14. Definition of done

- Fresh setup instructions work from a clean checkout.
- All P0 features work end-to-end and use persistent data.
- All ten acceptance scenarios are tested and results documented.
- Suggestions include evidence; no automatic merge/closure; decisions and key changes are auditable.
- Dashboard counts are database-derived and all demo records are labelled synthetic.
- No dead controls, major console/API errors or unhandled empty states remain.
- Five-minute demo is repeatable.
Assumption note: based on the team's current PS SIH26264 summary: institution-centred tracking across AICTE bureaus/cells, overlap detection despite differing references/descriptions, status/ownership/next action, chronology/audit, filters, alerts and analytics. Validate against the exact official PS text and submission template.
