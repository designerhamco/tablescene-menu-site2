# Loop Bagel spacing pilot — 2026-10-09

## Scope

Only Loop Bagel's desktop fit modes use the new font-linked, screen-corrected gap mapping. Other templates and mobile retain their previous mapping. Tablet portrait remains a natural scrolling layout below the desktop fit breakpoint. No starter menu content is changed by this pilot.

The mapping and bounds are recorded in `template-spacing-contract.md`. The candidate measurement, chosen state, validation and overflow backoff all use the same mapping. Secondary whitespace-driven enlargement is disabled only for this pilot. The convergence guard separates viewport changes from same-viewport stabilization.

## Browser checks

Settled DOM checks covered the visible category titles, item names/descriptions, prices, chips, featured content and footer against clipping ancestors. Fresh-page checks were used at each screen size. Live resize transitions were not counted as independently verified results because diagnostic attributes could remain stale until navigation.

| Case | Result |
| --- | --- |
| Default starter, PC 1280×720 | 16 items, ready, no clipping/horizontal overflow; font scale 1.04, gap scale 0.864 |
| Default starter, PC 1440×1000 | 16 items, ready, no clipping/horizontal overflow; font scale 1.34, gap scale 0.955 |
| Default starter, wide 1920×1080 and 2560×1440 | Ready, no clipping/horizontal overflow; bounded gap correction, no secondary final-fill boost |
| Default starter, tablet landscape 1198×838 | 16 items, ready, no clipping/horizontal overflow; font scale 1.28, gap scale 0.876 |
| Default starter, tablet portrait 838×1198 | Existing scrolling layout, no clipping/horizontal overflow |
| Default starter, mobile 408×862 | Existing typography and gaps retained; item name 15.04px, item gap 16px; no horizontal overflow |
| Ordered-fit mode, PC and tablet landscape | Ready, no clipped menu content; final-fill compensation remains 1 |
| English plus long-copy QA, tablet landscape | Ready, no clipping/horizontal overflow |
| Dense QA: 32 items and a long bilingual name, wide PC | Ready, no clipping/horizontal overflow |
| Dense QA: 32 items, tablet landscape | Ready using 4 rescue columns, no clipping; text becomes small and is not an ideal design target |
| Dense QA: 32 items, PC 1280×720 | Cannot safely fit; overflow detected and existing reload safety cover shown. Not counted as a successful layout |

`contentQa=dense` generates development-only cloned Loop Bagel items. Production previews and persisted starter data are unaffected. The dense case's small-screen failure is an explicit boundary of this pilot, not justification to compress gaps below the existing pixel floor or roll this calibration out to all templates. A separate content-budget/splitting decision is needed if that density must be supported on a short single-page canvas.

## Automated checks

- `npm test`: 507 tests passed.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed (run separately because the build configuration skips type validation).
- `npm run build`: passed.
- `git diff --check`: passed.

These are pre-delivery local QA results. The calibration remains a Loop Bagel-only pilot, not a common-template rollout; Git delivery and deployment status are verified separately.
