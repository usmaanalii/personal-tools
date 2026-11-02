# Issue #24: shared style guide through connection demos

Status: implemented. Source: [issue #24](https://github.com/usmaanalii/personal-tools/issues/24). Baseline: `main` at `95a935d` (verified 2026-11-02).

This is a refactor of two existing connection journeys. Preserve their requests, state lifetimes and user-visible feedback. Both demos adopt the shared light default; Next's current dark appearance changes as part of this approved style adoption. Dark mode support is deferred.

Read [QUICK-START.md](QUICK-START.md) for the implementation summary, [context.md](context.md) for existing contracts, and [reference.md](reference.md) for acceptance.

Proposed order:

- [shared-foundations.md](features/shared-foundations.md): tokens, owned controls, build integration and Storybook.
- [playground-adoption.md](features/playground-adoption.md): Playground consumer and regression evidence.
- [next-adoption.md](features/next-adoption.md): Next consumer and regression evidence.
- [verification-and-docs.md](features/verification-and-docs.md): CI coverage, dependency record, accessibility and documentation.

Out of scope: Quran branding, Quran rendering/dialog changes, backend contracts, database changes, and speculative controls. There are no Figma designs in the issue. This plan uses the refactor profile and existing UI states as its baseline; it does not invent new journeys or require mock designs for unchanged screens.
