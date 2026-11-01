# Repository guidance

- This repository is a pnpm workspace. Install dependencies from the repository root with `pnpm install`.
- Keep each app independently buildable, testable, and documented in its own `apps/<name>` directory.
- Run an app with `pnpm --filter <app-name> dev`; use the root scripts for the current default app.
- Keep app-specific code in its app directory. Add shared packages only when multiple apps need the same code.
- Treat all `VITE_*` values as public browser configuration. Never put service-role keys or other secrets in frontend code.
- Keep Supabase schema changes in migrations and require Row Level Security for tables exposed to client applications.
- See `.github/workflows/README.md` for CI-specific workflow conventions.

## Development principles

- For behavior changes, use TDD: write a behavior-focused test, run it and confirm it fails for the intended reason, implement the smallest change that makes it pass, then run the relevant regression checks. Keep the regression test with the behavior change.
- Before implementation, check the available skills and read the ones whose guidance applies to the task. Follow their workflows for relevant frameworks, design, accessibility, and testing. Apply skills selectively; user requests and repository instructions take precedence.

## Documentation

- Update the relevant documentation in the same change when adding or changing a feature or app. Keep the app's README current with its behavior, setup, environment variables, development commands, checks, and deployment instructions; update the root README overview when affected.
- Keep the root README's **Quick access** section at the top as the directory of live websites. Include every deployed app and separately addressable user-facing page, and update links when routes or domains change or pages are removed. Do not present an undeployed URL as live.
- Before handing back a change, check that its documentation and Quick access links match the implemented behavior and deployment status.

## Dependabot workflow

- Check whether dependency PRs overlap before merging; consolidate distinct, compatible updates into one PR when that simplifies review.
- For pnpm dependency bumps, update `pnpm-lock.yaml` with the manifest. CI uses `pnpm install --frozen-lockfile`, so a manifest-only bump fails.
- When GitHub connector write actions return 403, use the authenticated `gh` CLI for PR creation and merge if available.
- Prefer Dependabot’s native daily `multi-ecosystem-groups` for one scheduled PR across package ecosystems and directories; use a custom GitHub Actions job only when native grouping cannot meet the workflow.

## Git workflow

- After each completed task or independently reviewable unit of work, show the user the changes and ask whether they want them committed and pushed.
- Leave changes local until the user approves committing and pushing.
- Push approved changes only to `main` unless the user explicitly specifies another branch. Do not ask which branch to use; `main` is the default.

## Issue categorisation

Apply these conventions when creating or triaging issues. Keep the vocabulary small; add labels only when they support a useful filter.

- Choose exactly one work type: `type:feature` (new capability), `type:refactor` (restructure or standardise existing functionality), `type:design` (design exploration, specification or application), `type:bug` (correct a defect), or `type:maintenance` (routine upkeep).
- Apply one or more relevant areas: `area:quran`, `area:design-system`, `area:playground`, and `area:next-app`. Use the shared area alone for repository-wide design-system work; add app areas when they identify concrete consumers affected by the issue.
- `ready-for-agent` means the issue is sufficiently specified for an agent. It does not mean the issue is unblocked, approved for deployment, or exempt from repository commit/push rules. Check its blocking dependencies and explicit prerequisites before starting.
- Apply `needs-decision` when a named owner must select or approve something. State the required decision in the issue. Do not also mark that issue `ready-for-agent` until the decision is resolved and its acceptance criteria are actionable.
- Record dependencies through native blocking relationships when the available tool supports them; otherwise use explicit issue references under **Blocked by**. Avoid duplicating dependency state in a `blocked` label.
- Use milestones to group delivery phases when needed, rather than adding phase labels. Do not introduce priority or size labels without a concrete workflow need.
- Preserve existing Dependabot labels such as `dependencies`, `javascript`, and `github_actions`; these conventions do not require relabelling dependency PRs.
- Add labels without removing unrelated existing labels. Check for duplicates before creating issues, preserve research and unresolved assumptions, and obtain approval of proposed ticket breakdowns before publication.

## Planned shared UI and branding architecture

The approved migration is tracked in issues #23–31. These decisions describe planned ownership, not proof that the packages or migration are implemented; check current code and issue status before relying on them.

- Shared design tokens own foundation values, semantic mappings and themes. Shared UI owns reusable components, their styles and third-party primitive integrations. Apps own screen composition, feature presentation, data and application behaviour.
- Planned locations are `packages/design-tokens`, `packages/ui` and `docs/style-guide`. Introduce shared packages alongside working adoption by real consumers rather than creating speculative foundations.
- Complete shared default-guide adoption across existing user-facing surfaces before Quran branding exploration. Separate technical refactors, visual standardisation, design exploration and approved-brand rollout, with the owner approving the chosen identity.
- Behaviour-only refactors preserve appearance; style-guide adoption may make documented consistency and accessibility improvements while preserving functionality.
- Keep Quran-specific content rendering separate from generic branding. Preserve source-specific mushaf fonts, glyphs and canonical line layout; theme the surrounding interface without overriding those requirements.
