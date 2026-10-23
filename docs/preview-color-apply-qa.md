# Preview color application QA — 2026-10-23

## Changes

- All catalog color pickers stage HEX, spectrum, hue and keyboard edits; only Apply commits. Cancel, Escape, close/outside dismissal and default-reset staging preserve the current preview until Apply.
- Sale-chip backgrounds also color sale explanations, deadlines/countdowns and their clock icons. Explicit preview sale accents win over generic supporting-text colors without changing sale-price or state-chip colors.
- Order labels use the brightest menu color instead of a dark contrast substitution for bright category fills. Menu brand/supporting inks participate in the sampled palette. Identical fill/label colors retain a fallback; Call-circle contrast remains separate. The actual Dining course-heading selector is included.

## Browser evidence

- 19 Basic/Dining catalog/default/album designs × PC 1440×900, tablet 1180×820 and mobile 390×844: 57 cases with actual DOM dimensions, explicit bright category/page colors and overridden supporting text. All displayed sale-chip backgrounds and sale copy matched #2467AB; Order matched category #08E39A and its lightest menu swatch. No horizontal page overflow.
- Picker checks: HEX Enter/blur, spectrum pointer release/keyboard, hue pointer release/keyboard, Cancel, Escape and invalid Apply leave URL/iframe values unchanged. Apply commits once and closes; default reset opens a staged picker, Cancel retains the override and Apply clears it.
- User's existing Chrome preview was read without changing its selections. Neutral first-column tablet: slot 266.7px, Alata text 200.2px (75.1%). Actual selection checks of Outfit, Oswald and Alata on tablet/PC retained 74.99–75.00% width against the fitter's 267/327px integer slots. The existing one/two-line choice differs by font; brand fitting constants/code were not changed.
- User's bright-green/pink palette: Order fill #08E39A; old foreground #191C1B, corrected foreground #EED2D2. Discount-price colors remain unchanged while the sale copy follows its chip accent.
