# 行知 · Workspace polish

Audience: an SDET learner returning daily to study, write evidence, and build projects.
The overview must answer “what next?”; reading and editing pages stay quiet.

## References and decisions

- https://linear.app/features — organize work around the next actionable step.
- https://www.raycast.com/ — keyboard-first, searchable destinations.
- https://www.notion.com/product — separate knowledge, projects, and navigation.

These are interaction references, not copied layouts or downloaded assets.

## Design tokens

Ink pine `#233c35`, jade `#44685a`, fog `#eef0e9`, porcelain `#fafaf4`,
slate `#626d63`, aged brass `#b8955c`. Existing Jianghu imagery and Kaiti
are retained. Kaiti carries Chinese UI and headings; Segoe UI carries
English interface labels; Cascadia Code / Consolas carries numbers and shortcuts.

Layout: compact workspace heading → cinematic chapter → real ten-stage journey
→ four factual metrics → next step, recent notes and activity → project archive.

```
[brand] [primary navigation]             [command] [account]
Overview / Learning workspace          [notes] [daily]
[cinematic chapter: next learning step + supplied illustration]
[01 — 02 — 03 — ... — 10: actual stages and completion counts]
[progress] [streak] [time] [projects]
[next step] [recent notes] [activity]
[project archive]
```

Signature: the ten-stage journey is an actual navigable learning index, not
decorative numbering. No fake progress, count-up numbers, or demo achievements.
Critique: avoid a generic cream dashboard by replacing paper noise with a quiet
pine/fog working surface; keep cinematic art in the chapter only. No sidebar
redesign that would crowd the existing knowledge and project workspaces.

## Interaction contract

- Ctrl/Cmd+K opens a native modal command palette. Search, arrow keys, Enter,
  Escape, focus return, and direct search-page access all work.
- Commands expose only permitted destinations; public users get no creation actions.
- One short page entrance, tactile hover states and drawer entrance; all respect
  prefers-reduced-motion. Content is never hidden pending scroll JavaScript.
- No new packages, remote fonts, storage, authentication or data-adapter changes.
- Retain all existing E2E/image assertions and add focused interaction coverage.

## Verification

The full local sequence passes: lint, typecheck, 39 unit tests, production build,
and 9 E2E tests (the original eight plus one workspace-interaction scenario).
The new test checks public/Owner destinations, search and encoded fallback URLs,
keyboard selection, Escape/focus return, Ctrl+K, ten real stage links, 390px/320px
overflow, and reduced-motion behavior. All screenshot images keep the viewport-aware
complete/naturalWidth checks from PR #3.

Screenshots in v4 use isolated E2E fixtures, not actual learning achievements.
v3 is retained as the pre-polish comparison. No API, auth, adapter, repository data,
dependency or localStorage behavior changed.
