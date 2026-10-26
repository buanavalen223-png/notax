# AGENTS.md — Persistent Instructions for Nota

## Mission

Build **Nota**, a local-first personal finance web app for one individual. Read `PRD.md`, `DESIGN_BRIEF.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, and `HANDOFF.md` before making substantial changes. The image at `references/nota-visual-reference.png` is the primary visual reference.

## Source of truth

- Product requirements and business rules: `PRD.md`.
- Visual identity, layouts, and UX: `DESIGN_BRIEF.md`.
- Technology and data boundaries: `ARCHITECTURE.md`.
- Sequence and acceptance gates: `IMPLEMENTATION_PLAN.md`.
- Factual state of work: `HANDOFF.md`.

Do not silently resolve conflicts between documents. Report the exact conflict and ask for a decision before implementing affected work.

## Product invariants

- The app name is Nota.
- The product is single-user and local-first.
- Do not add login, registration, user profiles, bank connections, real accounts, real wallets, cards, payment-provider integrations, or real transfers.
- Core workflows must work without a server, cloud database, or AI provider.
- Money is stored as integer IDR values, never formatted currency strings.
- Balance logic and period summaries must live in tested domain functions, not be duplicated in components.
- Never populate normal user data with fake/demo records.
- Never claim that local browser storage is automatically encrypted.
- Never expose API secrets in frontend code.

## Visual rules

- Follow `DESIGN_BRIEF.md`; treat the reference as direction, not as a screenshot to clone.
- Use the warm off-white, emerald, soft green, lime accent, and charcoal tokens specified there.
- Avoid generic template dashboards, too many identical cards, decorative charts, unnecessary borders/shadows, and unlabelled controls.
- Design mobile and desktop intentionally; do not simply shrink the desktop layout.
- Every visible button/control must perform a real action or be clearly disabled/not yet available.
- No placeholder data masquerading as actual user finances.
- Prefer small, composable components and a consistent spacing/type scale over one-off styling.

## Engineering rules

- Use React + TypeScript + Vite SPA unless the owner explicitly approves an architecture change.
- Use IndexedDB through Dexie for persistent financial data; do not use `localStorage` as the transaction database.
- Components must not query Dexie directly throughout the UI. Keep data operations in repository/domain functions.
- Keep dependencies lean; add a dependency only when its benefit is clear and it is used.
- Lazy-load optional analytics/charts where practical.
- Use semantic HTML, keyboard-accessible controls, visible focus, and labelled form fields.
- Avoid broad `any`, ignored errors, fake stubs, dead buttons, and silent catch blocks.
- Do not optimize based on guesswork; measure bundle/performance when relevant.

## Workflow

1. Inspect working tree, project structure, current milestone, and existing conventions.
2. State a concise plan before a change that spans multiple files or changes data architecture.
3. Implement one milestone or coherent vertical slice at a time.
4. Keep changes scoped; do not refactor unrelated areas during feature work.
5. Run relevant tests, typecheck, lint, and production build if configured.
6. Report exactly what ran and whether it passed. Do not claim an unrun test passed.
7. Update `HANDOFF.md` after each milestone with modified files, completed work, tests and actual outcomes, known issues, and the next task.
8. Update other docs when the relevant product, visual, or architecture decisions change.
9. Do not remove user data, migrations, or files without explicit approval.
10. If an instruction is ambiguous and a wrong assumption could damage data or architecture, stop and ask instead of guessing.

## Required completion report

At the end of each task, report:
- Changes made.
- Tests/commands actually run and outcomes.
- Remaining gaps or risks.
- Docs updated.
- Recommended next step.
