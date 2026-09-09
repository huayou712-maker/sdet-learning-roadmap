# Page-specific Learning OS / V3

Audience: owner learning daily; public readers evaluating verifiable work.
Keep GitHub data, adapter, API and authorization unchanged.

## Design contract
Palette: ink #262219, paper #eee4c7, sand #b9a276, gold #aa8747,
red #873c32, jade #526147. KaiTi/STKaiti/Kaiti SC/BiauKai/serif for
headings and body; monospace only for code and commit references.
The signature is a stage-indexed learning ledger, not decorative cards.

Compare layouts: a shared card grid hides workflow differences and is rejected.
Use `stage index | checklist` for Roadmap, `taxonomy | note list | filters`
for Notes, `mini nav | document | TOC` for reading, `editor | preview | metadata`
for writing, tables for submissions, tabs for project workspaces, date feeds
for learning history, and a featured-project bento for public Portfolio.
Only dashboard and Portfolio get large imagery; production tools stay quiet.

## Gates
1. Shell/dashboard/roadmap: lint, types, unit tests, build; commit.
2. Notes/reading/editor: same checks; commit.
3. Assignments/projects: same checks; commit.
4. Daily/debug/timeline/resources/search/settings: same checks; commit.
5. Portfolio/mobile/a11y: same checks, E2E and ten inspected screenshots.
Filters use URL parameters. No synthetic production data or new persistence.

## Implemented review
Milestones 1–4 passed lint, typecheck, unit tests and build before their commits.
Milestone 5 adds public Portfolio, native mobile panels, regression coverage and
the V3 screenshot review. See v3/README.md for architecture, corrections and limits.
