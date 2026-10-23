# Preview design controls — 2026-10-23

## Changes

- Restore the existing transparent disabled ghost pagination arrows; prevent ordinary button disabled surfaces from leaking into icon navigation.
- Center the neutral LOGO placeholder icon/text artwork inside its existing 900×300 frame.
- Restore separate ordinary/time-sale chip background and foreground controls on all 13 Basic designs; keep overrides temporary and state/price colors independent.
- Move representative alignment into its own section and always left-align featured-product copy/chips.
- Use one shared image/chip radius preset in catalog and editor, preserving legacy values until a new choice and retaining the existing saved JSON/form contract. Remove logo controls; retain Dining full-bleed-cover behavior and album ratios.

## Validation

- Unit tests: 818 passing. TypeScript passed; lint passed with two existing unused-variable warnings.
- Browser matrix: 20 catalog/default/album designs × PC 1440×900, tablet 1180×820, mobile 390×844 (actual DOM viewport dimensions). The 39 Basic cases were checked again after contained-layout readiness and font loading. No horizontal page overflow, broken loaded images, or application errors. Ordinary and sale backgrounds/foregrounds matched separate overrides; featured copy stayed left; product/widget radius and chip shape matched the common preset.
- All six Dining designs: navigate to standalone product pages and verify the shared 8px product/widget frames. Full-bleed covers and Display remain separate.
- Actual preview controls: edit all four chip colors, select a common radius, cycle left/center/right identity alignment, navigate devices and detached view, then reset. URL/iframe values and rendered colors/shapes followed each action. Reset retained functional selections.
- Editor components: Basic/Dining at 320px and 1440px; one common radius select, no logo control, no page overflow. Hidden form values and legacy preservation are covered by the helper/form unit tests; no real customer save performed.
- SVG artwork bounds measured after render: horizontal center offset 0.5px and vertical center offset 0px.
