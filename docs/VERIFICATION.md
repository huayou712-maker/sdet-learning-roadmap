# V1.0 verification

Verified locally on Windows with Node.js 24 and an isolated Chrome test context.

| Gate | Result |
| --- | --- |
| ESLint | Passed |
| TypeScript | Passed |
| Vitest | 23 tests passed across 9 files |
| Production build | Passed; application routes are dynamically server rendered |
| Playwright | 5 flows passed, final run 40.9 seconds |
| Production dependency audit | 0 vulnerabilities reported |
| Original route documents | No changes to ROADMAP, PROGRESS, PROJECTS, RESOURCES or CODEX_PROMPT |

The browser suite covers public API write denial; owner note create/edit/history/trash/restore; progress commits and refreshed state; assignment submission; daily duration and search; SHA conflicts; evidence validation; upload rejection/acceptance; 1440/768/390px layouts; mobile editor preview. Screenshots in `docs/design/dashboard-*.png` use synthetic test data.

Each milestone passed lint, typecheck, unit tests and build before its commit: V0.1 (3 tests), V0.2 (9 tests, 2 E2E flows), V0.3 (14 tests, 3 E2E flows), V1.0 (23 tests, 5 E2E flows).

An intermittent browser assertion originally assumed a server-backed checkbox changes immediately on click. It now clicks, waits for the commit acknowledgement and reloads to verify persisted state. No assertions were removed from the saved-state check.

GitHub OAuth login, a live application save using a deployed PAT and Vercel deployment require account-side setup and have **not** been claimed as externally verified. The GitHub account used for code delivery was independently verified as `huayou712-maker`. CI results on GitHub are separate from these local results.

Data policy: GitHub is the only formal source of truth. Production cannot activate the filesystem test adapter. Runtime reads use only a short-lived process-memory cache; localStorage only stores unsubmitted drafts. No real GitHub write token is supplied to CI/E2E.
