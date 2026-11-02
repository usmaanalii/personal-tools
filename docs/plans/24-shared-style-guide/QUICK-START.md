# Quick start

Status: implemented and reviewed. The baseline was `origin/main` at `95a935d` on 2026-11-02.

Done:

- Read the handoff, issue #24, root/app guidance, existing connection components, tests, styles and CI paths.
- Confirmed #24 is open and unblocked, and #23 is complete.
- Resolved the visual contract: both demos use the shared light default; dark mode support is later work.

Recent changes (2026-11-02):

- Added shared tokens, Button and Storybook; both connection demos now consume the light default.
- Recorded exact dependency versions and measured bundle impact against the clean base archive.
- Vitest, Storybook, independent builds, lint and desktop/mobile browser checks passed; browser smoke includes axe. Removed CSS assertions from smoke after review.
- The owner chose light mode for both demos and deferred dark mode. Next's previous dark appearance changed; connection behaviour stayed app-owned.
