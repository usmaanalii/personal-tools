# Shared foundations

Status: implemented. Design: current connection pages; no Figma source.

- Define scale and semantic CSS properties for one shared light default, with one clear owner in `packages/design-tokens`. Do not add dark theme support in this issue.
- Add only a control used by both demos to `packages/ui`: the connection action Button. Keep state and copy in the apps. Preserve native button semantics, focus and disabled behaviour.
- Configure Tailwind to scan shared source in Vite and Next and avoid a reset that alters unrelated Playground routes. Keep complete class strings.
- Catalogue the adopted Button states in Storybook with autodocs and useful prop descriptions. Document any purely CSS surface/feedback patterns without creating extra React wrappers.
- Before adding dependencies, verify exact compatible releases, licences and the minimum shadcn/Radix source needed. Measure build output before and after adoption.

Build sequence: capture current build and visual evidence; add focused behaviour tests only for changed outcomes; introduce tokens/control and Storybook; run both apps' relevant checks. Confirm shared styles appear in each generated build.
