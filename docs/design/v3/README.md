# V3 workflow review

Screenshots are generated from isolated E2E fixtures. They are not production
business records and are not submitted to the content repository as learning data.

## Page architectures

| Page | Presentation |
| --- | --- |
| Dashboard | Current stage / next action, four metrics, three featured projects |
| Roadmap | Sticky stage index, single stage checklist, evidence and related records |
| Notes | Taxonomy sidebar, default compact list, URL filters and optional grid |
| Note | 800px editorial reading column, document navigation and TOC |
| Editor | Primary save toolbar, editor/preview, metadata sidebar |
| Assignments | Status tabs, semantic submission table, version timeline |
| Projects | Status-filtered visual catalog, overview/checklist/notes/debug/reports/history |
| Daily | Date navigation, actual/planned time and weekly learning totals |
| Debug | Issue library and eight-step incident document |
| Timeline | Date-grouped ordered activity feed |
| Resources | Source-document library filtered by mapped stage, topic and link type |
| Search | Type-grouped results and keyboard search input |
| Settings | Quiet connection/storage/account/security sections |
| Portfolio | Featured work, skills/progress/case bento and evidence-focused project summaries |

## Visual review corrections

- Reduced workspace background texture; retained imagery for home and Portfolio.
- Fixed primary-button contrast, mobile stage-navigation overflow and hero cropping.
- Stable source-line TOC anchors; enabled only on the main note document to avoid duplicate IDs.
- Mobile native dialogs provide focus trapping and Escape dismissal for taxonomy and assignment filters.
- Checked nine desktop pages at 1440px and all nine at 390px. Existing header checks also cover 320px.

## Limits / unchanged contracts

- Resource status/duration and note favorites have no stored fields: no fake persistence added.
- Resource-to-stage mapping is presentation-only and tied to the existing numbered resource document.
- Project evidence summaries and debug steps use existing Markdown headings; missing sections are explicit,
  and full original Markdown remains available.
- KaiTi requires a matching system font; fallback is serif. No font binary added.
- OAuth click states and permissions are tested; live OAuth callback requires valid deployment configuration.
- Auth backend, repository adapter, API routes, data models and formal data files are unchanged.
- Local storage remains limited to existing unsubmitted drafts. No new business-data persistence.

## Screenshots

Final local gate: lint, typecheck, 36 unit tests, 8 E2E workflows and production
build all passed. Deletion regression waits for the successful server response
and refreshed restore control before navigating, avoiding an aborted-request race.

[Dashboard](dashboard.png) · [Roadmap](roadmap.png) · [Notes](notes.png) ·
[Note detail](note-detail.png) · [Assignments](assignments.png) ·
[Projects](projects.png) · [Project detail](project-detail.png) ·
[Timeline](timeline.png) · [Portfolio](portfolio.png) · [Mobile](mobile.png)
