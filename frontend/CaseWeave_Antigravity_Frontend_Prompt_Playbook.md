# CaseWeave — Antigravity Frontend Prompt Playbook

**Purpose:** Build a distinctive, polished, trustworthy SIH 2026 frontend for PS SIH26264: Integrated Dashboard for Institution-Related Complaint Cases.

**Your role:** Frontend owner only. React + TypeScript + Vite. The backend and matching engine belong to other team members.

**Product promise:** “Connect the evidence. Keep the cases distinct. Make every decision explainable.”

**Working product name:** CaseWeave (provisional; do not spend implementation time on name/legal availability work).

## How to use this playbook

1. Open the correct repository in Antigravity and paste **Prompt 0** first.
2. Read the audit/plan it returns. Correct any wrong assumptions before implementation.
3. Paste Prompts 1–8 **one at a time**. Review the diff and run the stated checks after every phase. Do not ask Antigravity to execute the full playbook in one pass.
4. Paste Prompt 9 at the end for integration and stabilization.
5. If the existing repo differs from the proposed structure, preserve the working structure and adapt the plan. The prompts describe desired outcomes, not permission to rewrite working code.

---

# PROMPT 0 — Repository audit and frontend contract (NO CODE CHANGES)

```text
Act as a senior product designer and frontend architect joining an existing SIH 2026 team. The project is CaseWeave, a prototype for PS SIH26264: an institution-centred dashboard for reviewing potentially related complaints handled by different AICTE bureaus/cells.

MY OWNERSHIP: frontend only. The agreed stack is React + TypeScript + Vite. Another teammate owns FastAPI/database/persistence; another owns matching logic/evaluation; another owns integration/data/QA. You may inspect backend routes/schemas read-only to understand contracts, but do not edit backend or matching code.

TASK: perform a careful repository audit and produce an actionable plan. DO NOT modify files, install packages, reformat files, or generate implementation code yet.

Inspect:
- package.json, lockfile, Vite config, TypeScript config, current route setup, source tree and installed UI/style/icon/animation libraries;
- existing app shell, shared components, tokens, fonts, tests and scripts;
- current API service, TypeScript types, environment config and API error handling;
- available backend route definitions and schemas, read-only, to identify the actual contract;
- current work in progress and any code that must be preserved.

Core screens required:
1. Overview: database-derived open complaint count, relationships awaiting review, overdue next actions, potential cross-bureau links, plus actionable work queues.
2. Institutions: searchable institution directory and institution profile containing canonical name, identifier, aliases, separate complaints, bureau ownership, next actions and chronology.
3. Complaints: search/filterable register by bureau, status, category, institution, dates and relationship-review state; detail view with reference, description, dates, owner label, next action/due date, audit history and related cases.
4. Relationship Review: persistent candidate queue, side-by-side complaint comparison, evidence ledger, actions Confirm related / Dismiss suggestion / Needs more information, dismissal reason required, and audit/decision history.
5. Evaluation & Method: labelled synthetic benchmark metrics, precision, recall, F1, confusion counts, baseline comparison and examples of false positives/false negatives, only if the agreed API supplies them.

Non-negotiable product rules:
- Data is synthetic only. Make this obvious in the UI. Do not imply official AICTE endorsement, live integration, production readiness, or real-world accuracy.
- A relationship is a suggestion, not a duplicate verdict. Never merge, close, transfer or reassign cases automatically.
- Same institution alone does not prove a relationship. Similar wording alone does not prove a relationship.
- The frontend must render actual backend-provided evidence; it must not invent signals, scores, records, metrics or review outcomes.
- Dismissing a suggestion requires a reason. A relationship decision is separate from the original complaint status.
- No fake endpoints, dead controls, hardcoded dashboard counts, fabricated testimonials, fake partner logos or invented performance numbers.
- The frontend must handle loading, empty, error, success and disabled states.
- Keep accessible keyboard focus, semantic labels, readable contrast and responsive behaviour.

Return:
A. Current architecture and what already works.
B. Existing routes/screens/components and what can be reused.
C. Actual API routes, known field names and any contract gaps. Mark unknowns explicitly; do not guess.
D. Dependency assessment. In particular, determine whether a 3D library already exists. Do not install anything yet.
E. Recommended small implementation phases, files likely to change, exact commands already available, and risks.
F. Any decisions that require teammate agreement before coding.
G. A short acceptance checklist mapped to the five screens above.

STOP after the audit. Wait for my next prompt. Do not start implementing the plan on your own.
```

---

# PROMPT 1 — Create the design contract, design tokens and application shell

```text
Read your repository audit and inspect the current code again before editing. Implement only the design foundation and application shell. Do not build all screen content in this phase.

PRODUCT DESIGN DIRECTION: “Institutional precision.” The interface should feel like carefully designed public-sector/enterprise operations software: calm, legible, precise and human-made. Avoid generic admin-template styling.

ANTI-AI-SLOP RULES — treat these as acceptance criteria:
- No purple gradients, neon gradients, glassmorphism, glowing borders, giant gradient hero text, animated cursor, fake charts, decorative dashboards, stock AI imagery, robot illustrations, meaningless floating badges, excessive rounded pill buttons, fake reviews, fake user/customer counters or fake partner logos.
- No vague AI copy such as “Revolutionizing complaint management with next-gen AI.” Do not call the matcher an AI assistant. Describe the actual workflow and evidence.
- No emoji as interface icons. Use an already-installed consistent icon package, preferably Lucide if present. Do not add a second icon library.
- No excessive motion, bouncy transitions, cursor-follow effects, or animations that delay work.
- No huge empty hero section that pushes useful content far below the fold.
- Avoid unnecessary dependencies and wholesale rewrites. Preserve existing working code and project conventions.

INITIAL VISUAL TOKENS (adapt if existing design tokens are already good):
- Ink navy: #172B36 — headings, navigation, strong text.
- Deep teal: #146B62 — primary actions, selected state, key links.
- Canvas: #F4F6F5 — page background.
- Surface: #FFFFFF — cards/panels.
- Slate border: #D7E0E3 — dividers, borders.
- Supporting accent: muted sand/copper such as #B57A4B, used sparingly.
- Semantic success/warning/error states must include readable text labels, not colour alone.
- Use a restrained type scale. Prefer the existing font; otherwise use a clear system sans-serif. Use a monospaced face for complaint references/IDs only if it improves scanning. Do not add remote font dependency without need.
- Use 4px-based spacing, modest 6–10px corner radii, subtle borders, nearly flat surfaces and clear focus rings. Buttons should not be giant pills.

LAYOUT:
- Desktop: restrained left sidebar, compact top bar, clear page title/breadcrumb where useful, main content on a consistent grid and readable maximum width.
- Suggested initial proportions if the existing app has no system: sidebar 228–244px, top bar about 60–68px, content padding about 24–32px. Use flexible CSS, not hardcoded viewport widths.
- Sidebar destinations: Overview, Institutions, Complaints, Relationship Review, Evaluation & Method.
- Show a clear “SYNTHETIC DEMO DATA” label in the app shell. Do not imply this is an official AICTE product.
- Include a global search entry point only if its intended behaviour can be implemented honestly. If cross-entity search is not supported by the API yet, do not fake it; either implement a clearly scoped search or label/disable it honestly.
- Use active navigation styling that is visible but restrained. Maintain keyboard focus and accessible names.

IMPLEMENT:
1. Design tokens as CSS variables in the existing token/style location.
2. Reusable shell pieces: AppShell, Sidebar, Topbar or equivalent according to the existing structure.
3. A responsive nav that works on keyboard and narrow screens.
4. Shared PageHeader, Button variants, StatusBadge and panel primitives only if they fit the existing architecture.
5. A not-found route/page if the app already uses routing and lacks one.
6. A clear page-level container and responsive layout rules.

Do not add fake screen data or build the dashboard cards yet. Do not change backend/matching files. Do not install new libraries unless the audit showed a strong need and you explain it before installation.

VALIDATION:
- Run the existing typecheck/lint/build commands that are available.
- Confirm all nav destinations have an intentional route/placeholder state, not dead links.
- Check the shell at desktop and mobile widths and keyboard focus.
- Report files changed, commands run, exact results, and known issues. Do not claim a command passed if you did not run it.
- Stop after this phase.
```

---

# PROMPT 2 — Product landing page with a restrained 3D scroll narrative

```text
Read the frontend contract and existing design tokens. Implement a concise product-introduction landing page plus a working path into the application. This is a SIH prototype demonstration page, not a public marketing campaign. Do not modify backend/matching code.

PRODUCT COPY — keep it specific and honest:
Product name: CaseWeave (provisional).
Eyebrow: INSTITUTIONAL CASE COORDINATION · SYNTHETIC PROTOTYPE
Headline: “Connect the evidence. Keep the cases distinct.”
Supporting text: “A review workspace for exploring potentially related institution complaints across bureaus, with evidence, human decisions and traceable history in one place.”
Primary CTA: “Open workspace” → navigates directly to the real Overview route.
Secondary link: “See how review works” → scrolls to the explainer section.
A visible but quiet prototype notice must state that the demonstration uses synthetic data and is not connected to official AICTE systems.

CREATIVE CONCEPT: “The Thread of Evidence.”
Build an original, restrained 3D visual that represents two separate complaint records connected by an evidence thread around a stable institution anchor. The visual metaphor:
- Two slim, paper-like record panels begin as separate objects.
- A precise curved thread connects relevant evidence points, not the documents as if they were merged.
- An institution anchor/node provides common context.
- As the user scrolls through three narrative beats — “Find the institution”, “Inspect the evidence”, “Record a decision” — the cards and thread move subtly into a clearer comparison/timeline composition.
- The final state must still show two separate records. No visual should imply that confirming a relationship merges them.

3D IMPLEMENTATION RULES:
1. First inspect the package manager and available dependencies. If a reliable 3D library is already installed, use it. If not, recommend the smallest reasonable addition (for example Three.js plus React Three Fiber, with Drei only if necessary) and explain the dependency/size trade-off before installing. Do not add a pile of animation libraries.
2. Build the scene from simple original geometry: shallow document planes, thin lines/tube or curve, small evidence nodes and one institution anchor. Do not fetch a downloaded 3D model, use an AI-generated stock illustration, or create a generic floating orb/robot.
3. Keep lighting restrained, geometry clean, colours aligned with the design tokens, shadows soft and object count low. Avoid glossy glass, chrome, neon, particles and an arbitrary spinning object.
4. Tie scene progress to actual page scroll in a controlled way. Prefer a sticky scene paired with normal DOM content. The scene should respond to the three explainer sections without hijacking scroll or trapping the page in a canvas.
5. No autoplay loop unrelated to scrolling, no cursor-following, no exaggerated parallax. Motion should feel deliberate and slow enough to preserve comprehension.
6. Respect `prefers-reduced-motion`. In reduced-motion mode, show a composed static 3D/2D scene and readable content. Provide a CSS/SVG fallback if WebGL is unsupported, context creation fails or the device is too constrained. Do not leave a blank hero.
7. Make mobile layout simpler: reduce the scene size or replace it with a clear static diagram. Keep the headline, CTA and explanation first-class.
8. Lazy-load the 3D code if practical. Avoid blocking the first paint; handle loading and runtime errors gracefully. Keep a local fallback that requires no network.
9. The visual must not cover CTA buttons, text, keyboard focus, or app navigation. Test at normal laptop size and mobile width.

PAGE STRUCTURE:
A. Compact header: wordmark/name, subtle “Synthetic prototype” label, “Open workspace” link/button. No fake partner logos.
B. Hero: headline and short copy on one side; original 3D “Thread of Evidence” visual on the other. Keep the first CTA visible without scrolling on a typical laptop.
C. Three-step explainer in a restrained editorial layout:
   01 — Find context: see separate complaints under one institution.
   02 — Inspect evidence: review actual identity, metadata, category/date and text signals supplied by the matching service.
   03 — Record a decision: confirm, dismiss with a reason, or request more information; keep both complaint records separate.
D. A small “Built for careful review” section naming the principles: evidence visible, human decision, traceable history. Do not invent user benefits or quantified impact.
E. Final “Open workspace” CTA.
F. Minimal footer with “Prototype using synthetic data” and no unverified organization/contact claims.

ROUTING:
- Keep the real operational dashboard easy to reach. Use the existing route system. If `/` is used for the landing page, the CTA must link directly to the app Overview route; make sure the demo can deep-link to the Relationship Review screen too. Do not hide the app behind a long animation or mandatory onboarding.
- If the current architecture makes a standalone landing page risky, use `/welcome` and keep the operational route as the default; explain the trade-off instead of breaking existing routing.

DO NOT:
- Invent statistics, accuracy claims, case examples presented as actual production data, testimonial quotes or AICTE endorsements.
- Add “AI-powered” as the main differentiator.
- Make the landing page longer than needed for this concise narrative.
- Add scroll hijacking, forced full-page snap, custom cursor or excessive motion.

VALIDATION:
- Confirm CTA navigates to the real workspace.
- Test with reduced motion enabled, on a narrow viewport and with WebGL unavailable if feasible.
- Confirm there is still useful content without the 3D canvas and that the scene does not block navigation or text.
- Run build/typecheck and report actual results, dependency changes, performance concerns and fallback behaviour.
- Stop after this phase.
```

---

# PROMPT 3 — Frontend API layer, shared types and UI states

```text
Read the audit and established design contract. Implement the frontend data-access foundation only. Inspect the actual backend endpoints and schemas again. Do not edit backend or matching code. Do not guess fields.

KNOWN API ROUTES FROM THE TEAM'S IMPLEMENTATION SPECIFICATION (verify against the current backend before using):
- GET /api/health
- GET /api/dashboard/summary
- GET /api/institutions and GET /api/institutions/{id}
- GET /api/complaints
- POST /api/complaints; GET/PATCH /api/complaints/{id}
- GET /api/relationships
- POST /api/relationships/{id}/review
- POST /api/import/demo
- POST /api/import/csv
- GET /api/evaluation/summary
- GET /api/export/complaints.csv (optional later/P1)

RULES:
- The agreed backend schema is the source of truth. TypeScript types must accurately reflect it. If backend types or enum values are not agreed, create a short list of questions/contract gaps and stop on the affected feature; do not invent a second vocabulary.
- Create a small central API client using existing conventions. Respect the current environment variable convention for the API base URL. Do not hardcode a developer's localhost URL in production config.
- Provide typed request/response interfaces, useful error parsing, and explicit handling for network failure, non-2xx responses, empty results and validation errors.
- Do not swallow exceptions and silently return fake data.
- Never hardcode dashboard counts. They must come from `/api/dashboard/summary` or the exact agreed summary endpoint.
- Do not compute the match score or recreate evidence logic in React. The frontend renders the matching service's supplied signal values and explanations.
- Do not add a new state-management library if local state and the existing stack are sufficient.
- If the backend is not ready, implement the real loading/error/empty UI and document the missing endpoint. Do not disguise a disconnected UI with fake successful responses.

IMPLEMENT:
1. A typed API client in the existing service layer.
2. Types for Institution, Complaint, Relationship, review request/response, Evidence signal and AuditEvent, based only on verified schema. If a backend schema differs, use the actual names and document the mapping.
3. Small reusable API-state patterns/hooks or follow the project's existing data-fetching approach.
4. A consistent error message surface, retry affordance where retry is safe, and validation feedback.
5. A health/connection indicator only if it can be sourced honestly from `/api/health`.
6. Tests for API client success, validation failure and network failure using the project's existing testing setup, if present.

CONTRACT GAPS:
Provide an explicit list for the integration teammate instead of silently assuming fields. Especially verify relationship states (suggested/confirmed/dismissed/needs_info), dismissal reason field, evidence JSON shape, audit timestamps, due dates, score band names and pagination/filter syntax.

VALIDATION:
- Run available typecheck/tests/build.
- Verify the browser does not show a fake successful dashboard if API calls fail.
- Report exact API contracts consumed, files changed, tests run, pass/fail counts and unresolved backend dependencies.
- Stop after this phase.
```

---

# PROMPT 4 — Overview dashboard and reusable complaint-table patterns

```text
Read the frontend contract and API types first. Implement the Overview screen and shared reusable patterns needed by the remaining screens. Do not modify backend/matching code, and do not fabricate data.

DESIGN GOAL: the Overview should answer “What needs attention?” within a few seconds. Make it an action-oriented operational screen, not a gallery of cards.

LAYOUT:
1. Page header: “Overview”, concise sentence such as “Current workload and relationship-review activity.” Include a visible synthetic-data label if it is not already persistent in the shell.
2. A restrained row/grid of four database-derived figures:
   - Open complaints
   - Relationships awaiting review
   - Overdue next actions
   - Potential cross-bureau links
   These are labels, not invented counts. Use the actual summary schema and clarify each metric's meaning in a short caption/tooltip if needed.
3. Main section: “Needs relationship review” queue/list with institution, both references, bureaus, score band, age/created time if supplied, and a direct action to open the correct relationship in Relationship Review.
4. Secondary section: “Next actions” with complaint reference, institution, next action, owner label, due date and explicit overdue/due-soon text. Use backend-provided due dates and a consistent date/time zone strategy.
5. Optionally show a compact recent-activity timeline only if there is real API data for it. Never create fake activity to fill a gap.

INTERACTIONS:
- Each card/list item must have a meaningful action and keyboard-accessible focus.
- Summary cards may navigate to a relevant filtered list if that filter is supported by the agreed URL/API contract.
- Include loading skeletons that match final layout, a genuinely useful empty state, and clear retry/error UI.
- An empty review queue should not look like a broken app; explain that there are no pending suggestions in the current dataset, without claiming there are no real-world overlaps.
- Do not place charts on the screen unless they answer a real operational question and use actual data. Prefer readable lists over decorative charts.

REUSABLE COMPONENTS:
- DataTable or queue list, status labels, empty/loading/error state, section heading and filter chips only if reusable and not overengineered.
- Keep state ownership clear and TypeScript strict enough to catch malformed records.

VALIDATION:
- Confirm every number is sourced from the API and no fallback number is silently hardcoded.
- Test slow request, empty results, network error, and a normal populated response using the project's test setup or a documented manual method.
- Confirm queue links open the intended record/relationship.
- Run typecheck/tests/build and report exact outcomes. Stop after this phase.
```

---

# PROMPT 5 — Institution directory/profile and complaint register

```text
Implement the Institutions and Complaints screens using verified API types and the established design tokens. Read existing components first and reuse them. Frontend only; no backend or matching changes.

A. INSTITUTIONS DIRECTORY
- Clear title and short description.
- Search by canonical institution name and supported aliases/identifier only if API supports it.
- Use a compact, accessible table with canonical name, identifier, aliases/count if supplied, number of complaints if supplied, represented bureaus if supplied and latest activity only if available.
- Provide a real empty state, loading state, request error and clear-search/reset action.
- Do not infer a canonical institution identity in the UI. Render the backend's resolved value and expose uncertainty/missing identity honestly.

B. INSTITUTION PROFILE
Group information into:
1. Identity block: canonical name, normalized identifier, aliases, and any region/type fields if returned.
2. Complaints: separate record rows/cards with their own external reference, bureau, category, complaint status, owner label, submitted date and next action/due date.
3. Relationship context: distinct sections/labels for suggested, confirmed, dismissed and needs-information states, following the backend's exact enum values.
4. Chronology: events sorted using real timestamps. Clearly distinguish a complaint event from a human relationship-review decision.
- If a relationship map is implemented later, provide a fully usable accessible list/timeline equivalent. Do not make the map the sole source of information.
- Do not join separate complaint details into a single pseudo-case.

C. COMPLAINT REGISTER
- Search and filters, using the actual API query params/contracts, for bureau, status, category, institution, date range and relationship-review state.
- Compact table columns in priority order: Reference, Institution, Bureau, Category, Complaint Status, Owner, Submitted, Next Action/Due Date, Relationship Review State if the API supports it.
- Use sticky table headers only if they help at the current viewport. Keep column widths readable and support horizontal scrolling or responsive row cards on small screens.
- Clearly separate complaint status from relationship status; do not reuse the same badge for both.
- Add useful saved views such as All complaints, Overdue actions, Awaiting relationship review and Recently updated only if each can be mapped to a real filter. If the API can't support a view, don't pretend the filter works.
- Filter changes, sort changes and pagination must behave predictably. Preserve existing query params when practical; don't silently show stale records after filters change.

D. COMPLAINT DETAIL
Use an existing detail route/page or a side drawer if that fits the architecture. Display external reference, institution raw/canonical identity when available, bureau, category, description, submitted date, complaint status, assigned role/officer label, next action/due date, audit timeline and related-case panel. Include edit controls only if the agreed API permits it. If PATCH is available, handle field validation and save/error states; do not show a dead edit button.

UX DETAILS:
- Use short labels, readable dates and clear difference between missing and unknown values.
- Avoid giant rounded filter pills. Prefer compact labelled controls and a clear “Reset filters” action.
- Preserve a useful empty state when filters return zero rows. Do not confuse “no matches for these filters” with “there are no complaints”.
- Add proper accessible labels and keyboard navigation.

VALIDATION:
Test search, combined filters, clearing filters, profile navigation, long institution names/descriptions, missing IDs, empty results and API errors. Run typecheck/tests/build; report actual commands/results and stop.
```

---

# PROMPT 6 — Relationship Review Studio (the signature screen)

```text
This is the most important CaseWeave screen. Spend design effort here. Re-read the product rules and matching API response shape. Build a careful, evidence-first review workspace using only actual backend response data. Do not change backend/matching logic and do not calculate an alternative score in the frontend.

CORE EXPERIENCE:
The reviewer must be able to keep the candidate queue visible, compare two complaints, inspect evidence and record a review decision without losing context.

DESKTOP LAYOUT:
- Page header: “Relationship review”, a concise explanation, and the number of pending suggestions only if API-derived.
- Three-column workspace at suitable desktop width:
  LEFT — Relationship queue: compact list of candidates, selected-state indicator, references, institution and score band/state. Include filter/search only where supported.
  CENTRE — Side-by-side complaint comparison: two visually distinct but equal-weight complaint panels. Show reference, bureau, institution identity, category, submitted date, complaint status and description. Align key fields so differences are easy to scan. Truncate long descriptions carefully with a way to reveal the full text.
  RIGHT — Evidence ledger and actions: render matching signals returned by the service, their actual values, their direction/meaning if supplied, and a plain-language explanation only when the backend provides it or a deterministic frontend mapping approved by the team can accurately describe the signal.
- On smaller screens, reflow into a deliberate sequence (queue → comparison → evidence/actions) with clear back-to-queue navigation. Do not shrink the three columns to unreadable widths.

EVIDENCE LEDGER:
- Present groups such as “Supports a relationship”, “Needs scrutiny / conflicting context”, and “Unavailable information” ONLY when the underlying signal payload supports those interpretations.
- Potential signals may include institution identity, reference/metadata relationship, category compatibility, date proximity, TF-IDF/cosine description similarity and bureau context. Use actual fields from the API, not values invented by the UI.
- Show the observed value or comparison for every signal where available. For example, display that identifiers match or are missing; never display “verified” unless the backend says it is verified.
- Make it clear that a score band (High / Review / Weak or the actual agreed band names) prioritizes review, it is not a probability or a verdict unless the backend has explicitly defined it that way.
- A missing signal is “Unavailable/not provided”, not a neutral or positive signal.
- Show that different references do not automatically disprove a relationship. Equally, the same institution does not prove the complaints are related.
- Do not display an overall percentage as the sole explanation. If a score is included, show it as secondary context with an accessible textual band and an explanation of limitations.

REVIEW ACTIONS:
1. “Confirm related” — persist the human decision through the agreed review API and then show the returned/persisted state. Provide a concise confirmation step if needed, but avoid unnecessary modal friction.
2. “Dismiss suggestion” — opens a focused form requiring a non-empty reviewer reason. Show inline validation and do not submit an empty reason. Preserve entered text when server validation fails.
3. “Needs more information” — call the real API with the agreed state and optional note/reason fields only if the backend supports them.
4. Prevent repeat submissions while a request is in flight. Surface backend errors and keep the case visible if submission fails.
5. After success, refresh or update the relationship state from the server response. Do not optimistically show a decision as permanently saved before the API succeeds.
6. Keep relationship state separate from the complaint status. The action must never imply or trigger a merge, closure, transfer or reassignment.

AUDIT / DECISION RECEIPT:
- Show the existing audit timeline/history from the API, with event type, actor demo role and timestamp if returned.
- After a successful decision, visibly show the saved outcome and reason where applicable. This is a receipt for the action, not a fabricated client-only audit entry.
- When queue state changes, remove or reclassify an item based on returned persisted state; ensure dismissed links do not reappear as fresh pending suggestions if the API supports this distinction.

INTERACTION STATES:
- No suggestions, no evidence fields, missing complaint, stale relationship, API failure, submitting, validation error, successful decision and retry.
- If a record has missing institution identity, present that uncertainty clearly. Never infer an identity in React.
- Provide keyboard-visible focus and meaningful accessible labels for all actions.

DESIGN QUALITY:
- Use quiet panels, precise alignment, subtle divider lines and restrained status colour.
- Make supporting and contradicting evidence visually distinct without turning the page into green/red traffic lights.
- No fake AI chat panel, no animated confidence meter, no glowing edge, no fireworks/confetti and no “AI says this is a duplicate” language.
- Do not sacrifice readability for a screenshot-friendly layout.

VALIDATION / ACCEPTANCE:
- A reviewer can inspect a pair with different reference numbers.
- Same institution alone never triggers a frontend verdict or merge.
- Similar text across different institutions is shown with the backend-provided identity evidence/uncertainty.
- Confirm keeps both separate records visible.
- Dismissal without a reason is blocked client-side and also respects backend validation errors.
- Needs-info uses the agreed contract.
- Decision state and history persist after refresh/revisit if the backend supports persistence.
- Failed requests do not produce false success.
- Run typecheck/tests/build and report actual results. Stop after this phase.
```

---

# PROMPT 7 — Evaluation & Method screen

```text
Implement the Evaluation & Method screen only if the actual evaluation endpoint and response schema exist. If they do not exist yet, build a useful honest unavailable/contract-pending state and document the gap. Do not create invented numbers or sample benchmark results that look real. Do not change matching/evaluation code.

PURPOSE: help judges understand how the prototype is evaluated, including failure cases, instead of presenting a vanity accuracy percentage.

LAYOUT:
1. Page header: “Evaluation & Method” with a clear notice that the benchmark uses labelled synthetic examples.
2. Metric summary: precision, recall and F1, plus true positives, false positives, true negatives and false negatives when the API supplies them. Include short definitions or tooltips.
3. Baseline comparison: compare the current matcher with the simple exact-match/keyword baseline only if the backend returns both results on a comparable labelled dataset.
4. Error inspection: sample pairs grouped by correct suggestion, false positive, missed related pair and correct rejection only if the endpoint supplies those examples. Let the reviewer inspect the actual pair and evidence behind the classification.
5. Method description: describe the implemented approach accurately, e.g. institution/name normalization, rule-based metadata signals and TF-IDF/cosine similarity, only to the extent confirmed by the matching teammate.
6. Limitations: synthetic dataset, possible label bias, incomplete metadata, short descriptions and lack of real-world validation. Avoid claiming production performance.

VISUALIZATION RULES:
- Use simple labelled bars or compact tables only where they communicate a genuine comparison.
- Show counts next to rates. A percentage without sample size is not enough.
- Do not use a gauge, giant progress ring or green “accuracy” meter to imply certainty.
- Make false positives easy to find, not hidden behind a secondary tab.
- Explain that precision answers “Of the suggested links, how many were labelled related?” and recall answers “Of labelled related pairs, how many were found?” Use the agreed evaluation definition.

VALIDATION:
- Every displayed metric is sourced from the current API response and recalculates after data reset if the API supports that.
- Handle zero denominator/unavailable metric honestly instead of showing NaN or a fabricated zero.
- Distinguish unavailable benchmark data from real zero results.
- Test empty/error/loading states and run typecheck/tests/build. Report exact outcomes and stop.
```

---

# PROMPT 8 — Responsive behaviour, accessibility, micro-interactions and visual polish

```text
Perform a focused UX/quality pass across the implemented frontend. Do not add new major features, redesign the whole application, or touch backend/matching code. Inspect pages at realistic viewport sizes and fix actual issues.

RESPONSIVE CHECKS:
- Wide desktop (around 1440px): consistent grid, no awkward excessive whitespace, readable tables and stable sidebar.
- Typical laptop (around 1280px): relationship review columns remain legible; collapse/reflow when there is not enough room rather than compressing all content.
- Tablet (around 768px): navigation, filters and data tables remain usable; panels stack predictably.
- Mobile (around 375–430px): compact navigation, readable case cards, clear form controls and no horizontal page overflow. A table may use horizontal scrolling or a designed row-card view; choose intentionally.
- The landing 3D visual must scale down or use its fallback; it must not push the primary CTA off-screen or render unreadable tiny labels.

ACCESSIBILITY:
- Use semantic page landmarks, correct heading hierarchy, labels on form inputs, accessible names for icon-only buttons and visible focus.
- Ensure all key actions are keyboard operable and focus is not lost when a drawer/modal opens or closes.
- Use accessible validation/error summaries and announce state changes where appropriate.
- Never rely on colour alone to differentiate suggested/confirmed/dismissed/needs-info or complaint statuses.
- Check contrast, zoom/layout at 200%, reduced motion and touch-target usability.

MICRO-INTERACTIONS:
- Use brief state transitions only when they explain what changed: row selection, panel reveal, filter application, save confirmation.
- No animation on every card, no scroll-jacking, no custom cursor, no animated counters and no looping decorative motion.
- Landing page scroll effects must respect reduced motion and not make content harder to read.

DATA/UX INTEGRITY:
- Verify all counts and visible rows come from API responses.
- Verify all actions are real; remove or clearly mark any unsupported action instead of leaving a dead button.
- Show distinct loading, empty, error and success states for each important data flow.
- Do not fill empty areas with placeholder activity or fake metrics.
- Confirm the “Synthetic demo data” label remains visible in the operational app.

Run the available lint/typecheck/test/build commands. If browser automation or a screenshot tool is already configured, use it; do not install a new test framework just for screenshots unless there is a strong reason. Report each defect fixed and any unverified browser/device condition.
```

---

# PROMPT 9 — Integration gate, acceptance tests and demo readiness

```text
Run a final frontend-focused integration and acceptance pass. Do not claim the whole project is complete if backend, matcher or integration dependencies are still missing. Do not alter backend/matching code. Fix only frontend-owned defects, and report cross-team blockers clearly.

FIRST: inspect the current diffs and working tree. Do not discard other teammates' work or reset files. Verify the agreed schema/route contract with current code.

TEST THESE FLOWS:
1. Clean app launch and route navigation.
2. Landing page CTA reaches the real workspace and direct navigation to Overview and Relationship Review works.
3. 3D scene failure/reduced-motion/static fallback preserves all text and navigation.
4. Dashboard metrics load from the API and do not silently show hardcoded numbers.
5. Institution directory search and institution profile display separate complaints correctly.
6. Complaint register filters, search, clear/reset and details.
7. Relationship review shows two separate complaint records and backend-provided evidence.
8. Confirm-related action persists and never merges/changes complaint statuses automatically.
9. Dismissal requires a reason and backend validation errors are visible.
10. Needs-information action uses the actual API contract.
11. Refresh/revisit shows persisted decisions and audit history when supported by the backend.
12. Empty queue, zero-result filters, missing identifiers, missing evidence, stale record, network failure and backend-offline states.
13. Evaluation metrics only display when returned from the evaluation API; zero denominator/unavailable state is handled.
14. Keyboard navigation, visible focus, reduced motion, mobile layout and no horizontal page overflow.

REQUIRED FINAL REPORT:
- Implemented frontend pages/features.
- Files changed.
- Exact commands run and pass/fail counts. Do not claim tests passed if they were not run.
- API endpoints/contracts consumed and the ones still blocked by backend work.
- Any remaining dead/disabled controls or unresolved placeholders.
- Any accessibility/performance limitations, especially around 3D.
- A concise five-minute demo route: landing CTA → Overview → Institution profile → Relationship Review → inspect evidence → confirm a relationship → inspect audit event → dismiss a hard-negative with reason → Evaluation & Method.
- A clear statement that all sample records are synthetic and there is no live AICTE integration.

DEFINITION OF FRONTEND DONE:
The UI is coherent and responsive; all supported controls work; actual API data is shown honestly; relationship actions preserve separate records; failed requests never show false success; the 3D scene has reduced-motion and static fallbacks; all key P0 screens have loading/empty/error/success states; and the clean build/test results are reported accurately.
```

---

## Shared design and product rules to keep beside the repository

If the repository supports project-level agent instructions, save these as `docs/FRONTEND_BUILD_CONTRACT.md` or the repository's existing equivalent and ask Antigravity to re-read them before every prompt.

### The visual signature
- “Institutional precision”: quiet, trustworthy, editorially clear, restrained use of colour.
- A unique 3D “Thread of Evidence” scene, not a generic animated orb or stock model.
- The operational Relationship Review Studio is the real product centrepiece; the landing page must never obstruct the workflow.
- Clear hierarchy, aligned data, readable tables and meaningful blank space.

### The functional signature
- Evidence visible; uncertainty explicit; human decision; separate complaint records; audit trail.
- Real counts from the backend; no fabricated data or results.
- Use the matching service as the source of score/evidence; frontend is not the matching engine.
- No automatic merge, close, transfer or assignment.

### Scope discipline
- P0 first: app shell, Overview, Institutions, Complaints, Relationship Review, API/error states and audit visibility.
- P1 only after P0 works: relationship map and CSV export or other optional embellishments.
- The landing page/3D work must remain isolated and gracefully degradable; if it threatens core P0 delivery, finish the functional app first and keep the intro visual behind a small route/feature boundary.

### Suggested final route structure
Adapt to the existing router rather than forcing these exact paths:
- `/` or `/welcome` — concise product introduction and optional 3D scroll narrative.
- `/overview` — data-derived operations overview.
- `/institutions` and `/institutions/:id` — directory/profile.
- `/complaints` and `/complaints/:id` — register/detail.
- `/relationships` and `/relationships/:id` — queue/review workspace.
- `/evaluation` — benchmark and method.

### Demo discipline
Use the team's fixed synthetic dataset, repeat it after reset, and rehearse the same flow every time. Never refer to synthetic examples as actual AICTE complaints. Confirm the active relationship API states and evidence shape with the backend/matching owners before building against them.
