# Security fixes — 2026-09-09

Scope: the three findings from the local security audit. GitHub remains the sole
source of truth for formal learning records. No real records, progress, secrets,
browser storage, or deployment settings are changed by this patch.

## SEC-01: executable Markdown metadata

- Removed `gray-matter` and its automatic JavaScript engine selection.
- Front matter now accepts only unlabelled YAML, `yaml`, `yml`, or `json`.
  YAML uses the core data schema; unknown tags, duplicate keys, aliases, malformed
  delimiters and metadata larger than 64 Ki characters are rejected.
- Serialization writes validated metadata separately and appends the Markdown body
  unchanged. A body starting with `---js` is stored as inert text, not evaluated.
- Existing data-only YAML/JSON (including BOM/CRLF) remains readable. Existing
  unsafe or malformed repository metadata fails closed with a generic 503;
  repair that file in GitHub. Parser source excerpts are not returned or logged.

The original save canary now expects a successful, exact body round trip with no
side effects. The poisoned-repository test now expects rejection, not silently
skipping the record. Both explicitly assert that the canary was never executed.

## SEC-02: credential protection on writes

- Notes, assignments, project submissions, daily entries and debug records share
  the same high-confidence detector as text attachments. The check traverses
  text fields and nested metadata, and also checks attachment filenames.
- Recognized GitHub token prefixes and private-key headers cause a generic 400
  before create/update. Matches are never included in the response or logs.
- Serialization repeats the check so trash/restore cannot republish a credential.
  Permanent-delete commit messages use the record ID, not an unchecked old title.
- Redacted examples such as `ghp_<REDACTED>` remain valid learning material.

This is format-based accidental-disclosure prevention, not detection of every
possible secret. If a real credential already exists in Git history, revoke it
and handle history cleanup separately; this patch does not rewrite history.

## SEC-03: bounded history reads

- Reject malformed `page`/`ref` before reading content. A version must appear in
  the requested page of that record's branch-scoped history before its file is
  fetched. Current and historical visibility checks still apply.
- One GitHub `listCommits` call per page, 30 commits per page; no implicit
  `paginate` chain. The response stays an array, with `X-History-Next-Page` when
  another page may exist. The UI passes `page` when opening older versions and
  offers **加载更早版本**. There is no 30-version lifetime cap.
- History pages have a 60-second in-memory cache and share in-flight reads.
  File reads retain the existing 15-second cache. Successful writes invalidate
  caches, but never reset consumption counters.
- Per-process sliding windows: anonymous history API requests are limited to
  60/minute across all callers, independent of spoofable IP headers. Historical
  GitHub cache misses (lists and version files, including failures) share a
  separate 60/minute and 600/hour budget with a configured GitHub token; without
  a token the budget is 50/minute and 50/hour. Automatic Octokit retry/throttling
  is disabled so attempts cannot exceed this accounting. 429 responses include
  `Retry-After` and `Cache-Control: no-store`.
- The timeline shows the first page per recent record and directs users to the
  detail page for older versions. Progress activity is likewise a recent page.

Counters are bounded ephemeral memory shared across route modules in one process,
not business persistence. Cold starts reset them and multiple instances each have
their own budget. Distributed deployments need a shared edge/gateway rate limit;
this code alone does not establish a global GitHub quota guarantee. Current-file
reads and unrelated APIs are outside this history-specific upstream budget.

## Local acceptance

- Final run: lint PASS, typecheck PASS, **135/135 unit tests PASS**, production
  build PASS, **14/14 E2E PASS**. The final full browser run completed in 1.5 minutes.
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`,
  `npm run test:e2e` are the required acceptance sequence.
- Permanent regression suites: `tests/content-security.test.ts`,
  `tests/security-regressions.test.tsx`, `tests/adapter.test.ts`, and
  `e2e/security-regressions.spec.ts`.
- The browser suite retains all original image/visibility checks and adds inert
  Markdown, rejected-credential/no-overwrite and 31-version pagination scenarios.
- Tests use synthetic in-memory or isolated E2E data only. No test is skipped,
  deleted, weakened to accept execution, or given a larger timeout.
- `npm audit --registry=https://registry.npmjs.org --json`: zero reported known
  vulnerabilities for the resolved dependency set. `yaml@2.9.0` uses the official
  tarball URL and the verified SHA-512 integrity value in the lock file.

Implementation references: [YAML data schemas and alias controls](https://eemeli.org/yaml/#options),
[GitHub commit pagination](https://docs.github.com/en/rest/commits/commits#list-commits).
