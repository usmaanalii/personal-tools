# Project UX/UI skill catalogue

Scope: `usmaanalii/personal-tools` only. This catalogue is a set of external research references, **not** an installed skill registry. ChatGPT and coding agents should fetch the relevant upstream instructions at task time. Do not copy, install, pin, or modify skills without separate approval.

## Selection principles

- Choose 1–3 complementary perspectives for a task, rather than loading every skill.
- Use design skills in **investigation and ticket drafting**, not only implementation.
- Record the upstream repository, exact file path, and commit SHA used in each substantial design investigation or issue handoff; the links below follow default branches and are **not pinned**.
- Evaluate popularity and adoption as discovery signals, not as evidence of design quality. Recheck live metrics before making quantitative claims.
- Respect `AGENTS.md`, existing design decisions, and Quran-specific font, glyph, and canonical line-layout constraints.
- If an upstream file is unavailable, disclose this and continue with verified references; never imply that an unread skill was applied.

## Core perspectives

| Perspective | Skill | Upstream source | Use when |
| --- | --- | --- | --- |
| Visual direction | Anthropic `frontend-design` | https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md | Exploring distinctive layouts, typography and aesthetics |
| UI quality review | Vercel `web-design-guidelines` | https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md | Auditing UI patterns and interface quality; follow any linked current guidelines |
| Design references | `ui-ux-pro-max` | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md | Researching patterns, design systems and alternative directions |
| Interaction polish | Emil Kowalski `emil-design-eng` | https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md | Reviewing transitions, microinteractions and component behaviour |
| Accessibility | Addy Osmani `accessibility` | https://github.com/addyosmani/web-quality-skills/blob/main/skills/accessibility/SKILL.md | Checking WCAG, keyboard, screen reader and touch usability |
| Simplification and critique | Impeccable | https://github.com/pbakaus/impeccable/blob/main/plugin/skills/impeccable/SKILL.md | Critiquing density and removing distracting interface elements; inspect available subcommands before use |

## Suggested combinations

- **Reader-first mobile redesign:** UI UX Pro Max + Anthropic Frontend Design + Impeccable; then Vercel and Accessibility for validation.
- **Navigation and interaction prototype:** UI UX Pro Max + Emil Design Engineering; then Accessibility.
- **Existing UI audit:** Vercel Web Design Guidelines + Accessibility; add Impeccable for information-density critique.
- **Shared design system:** UI UX Pro Max + Vercel guidelines; respect existing shared tokens and components.

## Investigation-to-ticket handoff

For meaningful design work:
1. Inspect the current UI, relevant app `AGENTS.md`, and existing design decisions.
2. Read the selected upstream `SKILL.md` content and only necessary supporting references.
3. Compare at least two genuinely different design approaches when exploration is warranted; explain trade-offs and accessibility impact.
4. Identify a preferred approach, open questions, and what requires user approval before implementation.
5. In the proposed GitHub issue, include skill URLs and **resolved commit SHAs** when available, research findings, prototype scope, acceptance criteria, dependencies, verification, and Codex model/effort/escalation guidance.
6. Follow the repository's existing approval, issue-label and commit/push rules.

## Maintenance

This is an intentionally small, project-local catalogue. Reassess adoption, upstream activity, licensing, security and overlap before expanding or vendoring skills. Do not silently change references to unreviewed alternatives.
