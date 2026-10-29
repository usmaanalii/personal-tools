# GitHub Actions workflows

## Skipping work for unaffected changes

Avoid using trigger-level `paths` filters on pull request workflows when their
checks may be required for merging. GitHub skips the entire workflow when no
path matches, which can leave a required check pending and block the pull
request.

Instead, let the workflow start and use job-level change detection to skip
expensive jobs. A skipped job reports success for required-check purposes. The
Playwright workflow follows this pattern: its pull request `changes` job uses
`dorny/paths-filter` and the `playwright` job runs only when relevant files
changed. Direct pushes to `main` retain trigger-level path filters because
those runs are not serving as pull request checks. Manual dispatch runs the
Playwright job.
