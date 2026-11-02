# Verification and documentation

Status: implemented.

- Update Pages, Playground E2E and Next workflow filters so changes to either shared package run affected app checks. Give Storybook build and accessibility checks an explicit CI owner.
- Record exact dependency versions, licence sources, React/Vite/Next compatibility, browser bundle delta and upgrade ownership in the style guide. Update manifests and `pnpm-lock.yaml` together.
- Document ownership and consumption in `docs/style-guide`, both app READMEs and the root overview where needed. Recheck Quick access against deployed URLs; Storybook is not live unless deployed.
- Review automated accessibility violations as failures, then check keyboard order, focus visibility, disabled feedback, reduced motion and 320px/zoom fit in real rendered pages. Mark any browser-only evidence as such.
- Run required lint, tests and builds for both consumers after the last change. Assess all eight issue criteria with evidence before claiming completion.

Build sequence: update workflow/docs alongside adoption; run final gates; review resulting diff and acceptance evidence; present local change to user for the repository's commit/push decision.
