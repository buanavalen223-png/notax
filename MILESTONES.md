# Nota — Milestone Prompts for Gemini 4 Argon

Use one milestone at a time. Paste only the prompt for the milestone you are currently implementing. Do not ask the agent to build the entire application in one turn.

## Global operating rules

- Model: Gemini 4 Argon, used through the coding agent available to the owner.
- Read `AGENTS.md`, `PRD.md`, `DESIGN_BRIEF.md`, `ARCHITECTURE.md`, `HANDOFF.md`, and `IMPLEMENTATION_PLAN.md` before every milestone.
- `references/nota-visual-reference.png` is the primary visual reference. Follow its sense of whitespace, typographic hierarchy, modern finance presentation, and restrained green/lime accents. Do not copy banking, real-account, card, rewards, or payment features.
- Nota is a single-user, local-first, virtual personal-finance app. No login, no Supabase, no real bank/e-wallet integrations, and no cloud dependency for core features.
- Invoke installed skills only if actually available. Use UI/UX Pro Max for design-system guidance, Frontend Design for implementation, Impeccable for critique/refinement, React Best Practices for React performance, and Web Design Guidelines for accessibility/UX checks. Do not let generic skill suggestions override approved project docs.
- Work only within the named milestone. Do not implement future milestones or add unrelated dependencies.
- Inspect the repository before editing. Preserve user changes. Never claim tests, screenshots, or checks were performed unless they were actually performed.
- After work, update `HANDOFF.md` with files changed, actual checks and outcomes, known issues, and the next recommended task.
- At the end, summarize: implemented, files changed, checks run, visual review performed, limitations, and whether acceptance criteria passed. Stop for owner review.

---

## Milestone 0 — Repository foundation and visual shell

**Use this prompt first.**

> Implement Milestone 0 only from `IMPLEMENTATION_PLAN.md`.
>
> Start by inspecting the repository and confirming it is a clean, new Nota project. Read all governing documents and inspect `references/nota-visual-reference.png`.
>
> Set up a minimal React + TypeScript + Vite single-page application with Tailwind CSS v4 using its supported Vite integration. Use the package manager already established in the repository; if none exists, choose one and document the choice. Add only the minimum necessary dependencies, including Lucide icons if needed.
>
> Create a distinctive responsive app shell and a small design-token system based on `DESIGN_BRIEF.md`: warm off-white surfaces, emerald green, restrained lime accents, charcoal text, intentional typography, consistent spacing, subtle borders, and selective rounded surfaces. The UI must feel calm and premium rather than like a generic admin template.
>
> Build only the app frame and a minimal dashboard visual structure needed to review the design. Do not invent real transaction data, implement financial calculations, or scaffold nonfunctional future pages. Every visible control must work or must not be shown. Navigation may include only routes that genuinely exist.
>
> Use Frontend Design to implement the approved direction and UI/UX Pro Max to verify the design-system choices if those skills are installed. Do not run a broad redesign critique yet; this milestone establishes the baseline.
>
> Run installation, lint, typecheck, tests if configured, and production build where applicable. Inspect the app at desktop and narrow mobile widths using available browser tools. If browser tools or screenshot capture are unavailable, state that limitation rather than claiming visual verification.
>
> Update `HANDOFF.md`. Stop after Milestone 0 and present the result for approval.

**Review gate:** owner approves visual direction and responsive shell before data architecture work begins.

---

## Milestone 1 — Domain model and financial rules

> Implement Milestone 1 only from `IMPLEMENTATION_PLAN.md`. Inspect the existing code and reuse the approved structure; do not redesign the UI unless a minimal adjustment is required for integration.
>
> Define the domain model for transactions, categories, and application settings. Use integer rupiah amounts (no floating-point currency arithmetic). A transaction must have an ID, type (`income` or `expense`), amount, category, transaction date, optional note, and creation/update timestamps as appropriate. Define validation and explicit period/date semantics.
>
> Implement pure functions for total balance, period income, period expense, net cash flow, category totals, and date-range filtering. Opening balance is a setting, not income. Transfers are out of scope for the core MVP and must not be invented as income/expense records.
>
> Add focused unit tests for positive and invalid amounts, empty data, opening balance, period boundaries, income/expense totals, category filtering, and edit/delete recalculation semantics. Keep calculations outside React components and avoid duplicating business logic in UI code.
>
> If a requirement is ambiguous, document it in `HANDOFF.md` instead of silently making a product decision. Do not build transaction screens, onboarding, backup, analytics pages, or AI in this milestone.
>
> Run relevant tests, typecheck, lint, and build. Report exact commands and results. Stop for review.

**Review gate:** financial rules and tests are approved before persistence is connected.

---

## Milestone 2 — Local persistence and first-run setup

> Implement Milestone 2 only. Use IndexedDB through Dexie as specified in `ARCHITECTURE.md`, with schema versioning and a small repository/data-access layer. Keep database calls out of presentation components.
>
> Add first-run setup to explain clearly that Nota stores virtual personal-finance records locally in this browser/device and does not connect to real accounts. Let the user set an opening balance in IDR. Save the setting persistently and provide a simple way to change it later.
>
> Handle database initialization errors and empty state safely. Do not add authentication, cloud storage, external network calls, fake transactions, or optional features. Do not imply data automatically synchronizes between devices.
>
> Test persistence across reloads, setting changes, empty database behavior, and storage errors where practical. Opening balance must never be counted as period income.
>
> Update `HANDOFF.md`, report any browser storage limitations, and stop for review.

**Review gate:** the owner confirms local storage behavior and opening-balance semantics.

---

## Milestone 3 — Dashboard with real data

> Implement Milestone 3 only. Use the approved design tokens and reference image. Before coding, inspect the current shell and propose a short layout plan: hierarchy, spacing, mobile behavior, and which elements deserve emphasis. Then implement the dashboard.
>
> The dashboard should prioritize: (1) current virtual balance, (2) selected-period income and expenses, (3) net cash flow or a simple useful trend, and (4) recent transactions when available. Use a single clear visual focus and avoid excessive cards, repeated borders, decorative charts, reward features, and unnecessary widgets.
>
> All values must come from persisted data and tested domain functions. Provide a calm empty state with one clear action to add the first transaction. Provide obvious quick actions for income and expense only if the corresponding workflow is implemented in a later approved milestone; otherwise do not expose dead buttons.
>
> Use Impeccable for one focused critique pass after implementation. Apply only fixes that improve the approved direction. Use Web Design Guidelines for accessibility and responsive checks if installed.
>
> Review screenshots at mobile and desktop sizes when possible. Verify that figures are readable, no horizontal overflow occurs, and the layout is not a stack of identical cards. Run relevant checks, update `HANDOFF.md`, and stop for review.

**Review gate:** owner approves dashboard hierarchy and visual direction before transaction management UI is expanded.

---

## Milestone 4 — Transaction management and quick entry

> Implement Milestone 4 only. Build the real transaction flow: list, add, edit, delete with confirmation where appropriate, search, and filters for type, category, and period. Create a quick-entry form optimized for keyboard and mobile use.
>
> Keep the form focused: transaction type, amount, category, date, and optional note. Default the date sensibly. Use Indonesian labels, clear IDR formatting, accessible validation, visible save/error feedback, and safe handling of repeated submissions. Do not make the form unnecessarily long.
>
> Persist through the repository layer. Recompute summaries from the domain functions after changes; do not manually increment/decrement displayed totals in ways that can drift. Ensure edits and deletions cannot double-count or leave stale dashboard values.
>
> Add unit and end-to-end tests for add/edit/delete, search/filter, invalid input, persistence, dashboard refresh, and empty states. Use browser automation only if available and report actual coverage.
>
> Use Impeccable only for targeted refinement after the core flow works. Do not add budgets, debt tracking, analytics, AI, bank/wallet integrations, or cloud services. Update `HANDOFF.md` and stop for review.

**Review gate:** complete transaction workflows and correct summaries are verified before backup work.

---

## Milestone 5 — Backup and recovery

> Implement Milestone 5 only. Add export and import for a versioned JSON backup containing Nota's supported local settings, categories where user-editable, and transactions. CSV export may be added only if it remains small and well-tested.
>
> Import must validate the entire file before mutating data. Show a readable preview and require explicit confirmation. Define whether import replaces or merges existing data; default to a safe, clearly explained replace workflow only after backup/confirmation. Invalid or incompatible files must not partially overwrite existing records.
>
> Provide clear messaging that local browser data can be lost if browser storage is cleared or the device is changed. Do not add cloud sync or upload backups anywhere.
>
> Test export-import round trips, malformed JSON, unsupported schema versions, duplicate IDs, invalid amounts, cancellation, and rollback/no-partial-write behavior. Update documentation and `HANDOFF.md`; stop for review.

**Review gate:** backup recovery is proven before optional features are considered.

---

## Milestone 6 — Quality, accessibility, and performance

> Implement Milestone 6 only. Audit the actual application before changing it. Use React Best Practices and Web Design Guidelines if installed, and use Impeccable only for concrete visual issues.
>
> Check keyboard navigation, visible focus, semantic labels, form errors, contrast, reduced-motion preferences, empty/error states, narrow-screen overflow, and touch target usability. Measure the production build and identify actual bundle or interaction bottlenecks before optimizing. Avoid speculative memoization or adding libraries without evidence.
>
> Fix the highest-impact confirmed issues first. Keep the approved design intact. Run tests, lint, typecheck, production build, and available browser checks. Record measurements, limitations, and evidence in `HANDOFF.md`. Stop for review.

**Review gate:** owner approves core MVP quality and any remaining known limitations.

---

## Milestone 7 — Optional planning features (approval required)

> Do not begin until the owner explicitly approves this milestone and selects the feature(s) to implement.
>
> Propose a small feature plan for one selected module only: budget planning, savings goals, recurring bills/contributions, or debt/receivables. Explain the data model, how it affects the dashboard, and what must not be double-counted. Wait for approval of the plan before coding.
>
> Implement only the approved module, including persistence, validation, empty/error states, and tests. Keep optional information out of the primary dashboard unless it adds clear value. Update product docs and `HANDOFF.md`; stop for review.

---

## Milestone 8 — AI exploration (optional, separate approval)

> AI is not required for Nota's core MVP. Do not add AI automatically.
>
> First propose a privacy and architecture decision document describing intended user value, exact fields that may be sent externally, consent UI, data minimization, provider configuration, costs, failure behavior, and how Nota remains fully usable without AI. Never embed secret API keys in client code. Do not send finance data to an external provider without explicit informed user consent.
>
> Wait for owner approval of the proposal before implementation. If approved, implement the smallest useful AI feature and test network failure, empty data, prompt injection from transaction notes, and data disclosure boundaries. Update `HANDOFF.md`; stop for review.

---

## Final milestone handoff template

At the end of every milestone, report:

1. Scope completed.
2. Files created/changed.
3. Commands actually run and their results.
4. Tests passed, failed, skipped, and why.
5. Visual review performed, viewport sizes, and screenshot location if available.
6. Known limitations and unresolved decisions.
7. Whether each acceptance criterion passed.
8. The single recommended next step.

Do not proceed to the next milestone until the owner approves the result.
