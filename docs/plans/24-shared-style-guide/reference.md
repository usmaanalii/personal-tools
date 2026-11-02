# Acceptance and decisions

The issue's acceptance criteria map to these checks:

| Criterion | Proof required |
| --- | --- |
| Shared packages adopted in both journeys | Both app manifests consume workspace packages; built pages render adopted controls. |
| Default tokens and accessible treatments | Token inventory covers typography, spacing, surface/colour, radius, shadow, icon, motion/reduced motion, focus, disabled and feedback; rendered contrast, keyboard and reduced-motion checks pass. |
| Existing behaviour and server boundary | Existing and focused Vitest tests pass; unchanged HTTP paths and server-only environment references are reviewed. |
| Storybook catalogue | Adopted components and meaningful visual states render with autodocs and prop descriptions; Storybook builds. |
| Vite/Next integration | Each production build contains styles from shared sources; Next page/layout remain Server Components and the interactive leaf stays client-side. |
| Dependency record | Exact versions, licences, compatibility, bundle comparison and upgrade owner are recorded; manifests and lockfile agree. |
| CSS token contract | Scale values and semantic theme mappings have separate ownership; Tailwind and bespoke CSS use the CSS properties; class names are complete literals. |
| Documentation | Style guide and both app READMEs describe usage and states. Root Quick access is checked against actual deployed routes. |

Visual decision (owner, 2026-11-02): both demos use one shared **light** default. Playground already has a light page; Next's dark page changes to the shared light appearance. Preserve connection behaviour and content. Dark mode support is future work, not a hidden theme variant in #24. No brand identity is implied by the Quran reference.

Dependency gate: the issue selects shadcn-owned source, Tailwind and initially Radix when a headless primitive is needed. Both adopted actions are native buttons, so no Radix dependency is installed for this slice. Verify exact versions/licences and use a Radix primitive only where an actual adopted control needs it. Record bundle impact against the current build. Do not add speculative dialog/menu variants.

Done means all eight criteria have direct evidence, every required app and CI check passes, documentation matches deployed routes, and the user has reviewed local changes before any commit or push.
