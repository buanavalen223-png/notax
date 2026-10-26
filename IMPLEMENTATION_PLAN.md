# Nota Implementation Plan

Work in the order below. Each milestone ends with a review gate. Do not skip ahead merely because a page can be generated quickly.

## Milestone 0 — Repository foundation and design tokens

### Scope
- Create React + TypeScript + Vite SPA.
- Add Tailwind CSS v4 through its official Vite integration.
- Establish theme tokens from `DESIGN_BRIEF.md`, typography, basic layout primitives, Lucide icons, and responsive app shell.
- Set up lint/typecheck/test scripts with compatible stable tooling.
- Establish folder structure without unnecessary abstractions.
- Add a minimal app shell with Nota identity and real navigation only for implemented routes.

### Do not do
- No auth, Supabase, remote database, wallets, bank features, AI API, or financial feature implementation yet.
- Do not scaffold every optional page with fake content.

### Acceptance gate
- Fresh install, dev server, production build, and lint/typecheck commands work.
- Responsive shell is checked at desktop and mobile sizes.
- Visual tokens are centralized and documented.
- No unused placeholder controls.

## Milestone 1 — Local data model and domain rules

### Scope
- Add Dexie/IndexedDB schema and schema versioning.
- Implement Transaction, Category, and Settings domain types and repositories.
- Implement money formatting, date/period helpers, summary calculations, and input validation.
- Seed only category definitions, not fake transactions.

### Acceptance gate
- Unit tests cover balance, income/expense summaries, category filtering, period boundaries, edit/delete consequences, and invalid amounts.
- App handles empty database without errors.
- No query logic is duplicated in UI.

## Milestone 2 — Onboarding and local persistence

### Scope
- Lightweight first-run setup: explain virtual/local data and set opening balance.
- Save settings in IndexedDB.
- Add clear path to change opening balance later.

### Acceptance gate
- Reload preserves setup values.
- No login or network required.
- Opening balance is not counted as period income.

## Milestone 3 — Dashboard design and real summary

### Scope
- Build dashboard according to `DESIGN_BRIEF.md` and `PRD.md`.
- Display actual balance, selected-period income/expenses/net, a compact recent transaction list, and one meaningful visual when data exists.
- Empty state provides a useful next action.
- Add visible actions to record income and expenses.

### Acceptance gate
- Screenshot reviewed at mobile and desktop widths.
- Summary values come from tested domain functions and persisted data.
- No sample transaction/reward/account UI.

## Milestone 4 — Transaction CRUD and fast form

### Scope
- Add/list/edit/delete transaction.
- Search, type/category/period filters, sort.
- Quick-entry form with accessible validation and feedback.

### Acceptance gate
- End-to-end add/edit/delete flows pass.
- Dashboard updates after every operation.
- Failed persistence is surfaced clearly.
- Dates and Rupiah formatting are consistent.

## Milestone 5 — Backup, restore, and hardening

### Scope
- Export JSON backup and optionally transaction CSV.
- Validate preview and import flow; replace only after explicit confirmation.
- Handle invalid/corrupted backup safely.

### Acceptance gate
- Round-trip export/import test succeeds.
- Invalid backups do not partially overwrite data.
- User receives clear data-safety messaging.

## Milestone 6 — UX polish and performance pass

### Scope
- Keyboard/accessibility review, empty/loading/error states, mobile layout adjustments.
- Measure production bundle and interactions.
- Lazy-load non-core pages/charts if the measurements warrant it.

### Acceptance gate
- Test matrix includes narrow mobile, tablet, laptop, desktop.
- No horizontal overflow or dead controls.
- Record measured bundle/performance results in handoff.

## Milestone 7 — Optional planning and analytics

Proceed only after approval. Add analytics, budgets, savings goals, recurring bills/contributions, or debt tracking one module at a time, with explicit data rules and tests.

### Acceptance gate
- Optional module does not crowd the dashboard.
- Related balances and cash flow are not double-counted.

## Milestone 8 — AI exploration (optional)

Not required for core product. Propose a separate architecture and privacy flow before implementation. Never store provider secret keys in browser code and never send personal finance data externally without explicit informed consent.

## End-of-milestone checklist

- Tests, typecheck, lint, and production build actually executed as applicable.
- Main user flow verified, not only compilation.
- Screenshot or responsive check recorded for visual milestones.
- `HANDOFF.md` updated with actual status, exact results, limitations, and next task.
