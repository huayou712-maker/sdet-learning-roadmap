# Architecture and verification

## Boundaries

- `app/`: dynamic App Router pages and server APIs. `pages/api/auth` contains only stable next-auth's OAuth handler.
- `lib/auth`: encrypted JWT session extraction. `lib/github/authz.ts` requires the exact owner login on every mutation.
- `lib/github/client.ts`: Octokit adapter, configured content branch, safe paths, GitHub SHA updates, history and immutable ref reads. A bounded 15-second process-memory read cache is invalidated after writes. No persistent application cache.
- `lib/content`: front matter, note/assignment/daily/debug/project CRUD, uploads and timeline. `lib/schemas`: input validation.
- `data/`: version-controlled roadmap definitions, initial completion state, project definitions and profile. The running app reads them through GitHub, not local imports.
- `components/`: Markdown editing/preview, explicit GitHub save, disclosure, history, evidence and readonly/owner rendering.
- `tests/`: memory adapters, schema and business rules, UI states. `e2e/`: actual browser tests against isolated synthetic fixtures.

## Writes

Browser → same-origin check → owner session → bounded body/schema → content service → GitHub adapter → commit SHA. All mutations require a public-repository acknowledgement. Missing secrets yield an actionable error, not fake success. Updated files require the client's SHA; a stale SHA produces 409 rather than overwriting remote content.

Content:

- notes: `content/notes/<stage>/<date>-<slug>-<uuid>.md`
- assignment iterations: `content/assignments/<assignment>/<uuid>.md`
- daily: `content/daily/YYYY/MM/YYYY-MM-DD.md` (one per date)
- projects: `content/project-submissions/<project-id>.md`
- debugging: `content/debug-journal/<date>-<slug>-<uuid>.md`
- attachments: `content/assets/<date>/<uuid>.<extension>`

Assignment iteration files are independent; editing an iteration adds a Git commit instead of destroying file history. Trash uses `deletedAt`, restoration commits an update, and permanent deletion requires separate confirmation. Git history is not erased.

## Visibility and statistics

Public content reads filter both `showInPortfolio` and `deletedAt`; server APIs enforce the same gate. The roadmap definition and completion counts are public. Display flags do not make public GitHub files private. Historical content is independently checked before public rendering; public history messages are generic to avoid revealing former hidden titles through the UI.

Daily `actualMinutes` is the sole total-time source; note/debug duration is contextual, not added again. UTC dates define consecutive learning days (today or yesterday may start a streak). Assignment counts count independent submissions. Completed project count uses project status. Missing evidence highlights completed roadmap items without linked outputs.

## Verification matrix

| Area         | Automated coverage                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| Migration    | 10 stages, all original progress labels and completion state; six project definitions                          |
| Security     | exact owner, readonly write denial, path traversal, source origin, input size/schema                           |
| Notes        | create/edit, stale SHA, soft delete, restore, disclosure and delete confirmation                               |
| Learning     | independent assignment iterations, daily uniqueness/date validation, project checklist, topic/stage validation |
| Data policy  | runtime GitHub adapter only; test adapter cannot run in production or with real PAT                            |
| Presentation | public/owner filtering, search visibility, real statistics, project checkbox                                   |
| Uploads      | extension/MIME, basic binary signature, text validation, max size, obvious credential rejection                |
| Browser      | note lifecycle, progress, assignment, daily, search, visibility, conflict, attachments, viewport layout        |

`npm run migrate` is a development-time generation tool, not a runtime persistence path. Review its output before committing; it preserves existing progress IDs. Test fixture files are synthetic and Git-ignored, never used for a real user session. Production requires actual OAuth/PAT/deployment validation after secrets are configured.

## Scope limits

Personal small-repository scale, not a multi-user LMS. Content schema is shared across record kinds; each service validates its kind-specific requirements. The timeline expands history for 30 recent records, while individual History views provide full per-path history. GitHub API quotas and protected-branch policies can reject writes and must be addressed through account configuration, not a local fallback.
