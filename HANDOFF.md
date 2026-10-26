# HANDOFF — Nota

## Current status

- Phase: blueprint / before implementation.
- Product name: Nota.
- Repository: intended to be a new repository with independent Git history; repository has not been created by this document pack.
- Implementation: not started by this blueprint pack.
- Tests: not run; no application source code exists in this pack.

## Decisions confirmed by product owner

- Personal, single-user finance manager.
- No login, bank account, real wallet, real financial integration, or account number.
- Local-first application; core functionality should not require server/cloud storage.
- Main focus: overview of virtual balance, income, and expenses.
- Additional features can include planning, budget, debt/receivables, contributions/bills, analytics, and possibly AI later.
- Visual direction: premium, calm, emerald with lime accent, inspired by `references/nota-visual-reference.png`.
- Must work comfortably on desktop and mobile.
- Transaction entry should be quick.

## Outstanding decisions

- Confirm any preferred font if the system font stack is not sufficient; default is system sans-serif.
- Decide whether the owner wants app-lock/PIN or encrypted exports; not part of MVP.
- Decide AI approach only after core local-first MVP is stable.
- Decide whether installation as a PWA is required for the first release; architecture can defer it.

## Next task

1. Create a new repository, independent of the old `finance-manager` history.
2. Copy the blueprint documents and reference image into repository root/`references`.
3. Ask a coding agent to read every source-of-truth document and execute Milestone 0 in `IMPLEMENTATION_PLAN.md` only.
4. Before coding beyond the foundation, inspect the generated scaffold and run its checks.

## Handoff format for future agents

Update this document after every milestone using these sections:
- Date / milestone
- What was implemented
- Files changed
- Commands/tests actually executed and results
- UI screenshots or visual validation performed
- Known bugs/limitations
- Architecture/PRD/design changes, if any
- Recommended next task

Never mark features complete based only on a TODO list or a successful build. Verify the feature at the user-flow level.
