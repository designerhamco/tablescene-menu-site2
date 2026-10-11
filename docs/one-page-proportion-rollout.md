# Single-page proportion-first behavior — 2026-10-11

## Approved scope

User approved the KOHI tablet result, then requested common principles only for other templates. Apply to REAL MATCHA, KOHI, Mocha Forest, Sunday Roasters, Van Gogh, Rosy Orange and Loop Bagel. Do not copy KOHI's numeric calibration or change starter menus, role proportions, brand/heading colors, fonts, images, widget ratios or notices. Display/multi-page and retired/coming-soon renderers are excluded.

## Shared behavior

- Primary fit keeps existing candidate ceilings and template-specific gap mapping. KOHI's `1.20` tablet / `1.24` PC ceilings and Loop Bagel's screen/font spacing formula remain exclusive to those templates.
- All seven skip post-fit whitespace enlargement and final-fill font/gap boosts. Residual whitespace is acceptable when bounded proportions and readability are already good.
- Between-item spacing uses the template's existing base rhythm: both supporting fields visible = `1×`, one = `1.15×`, neither = `1.35×`. Active promotion support, origin or traits keep normal rhythm. Visibility is derived from the localized rendered row.
- The CSS multiplier applies once, only to non-last items, in mobile/portrait scroll and desktop/tablet fit. Category, heading, widget and footer boundary tokens remain unchanged.
- Category order/merging, preferred/rescue column tiers, wrap-density penalties and reductions, price alignment/option headers, fixed-shell brand placement, final-column footer docking and DOM-crop/loading safeguards remain active.
- The shared gate is explicit and tested against the current active dining single-page catalog. A future active single-page template must opt in and pass that coverage test rather than silently inheriting an unverified calibration.
- Legacy REAL MATCHA multi-page presentations reuse CafeA internally. They now identify their presentation as `multi` instead of `one`, so the common single-page policy is excluded. This flag is passed directly to CafeA (not back through the dispatcher); navigation, pagination and layouts are unchanged.

## Verification boundary

Final local checks: `npm test` passed 536 tests; TypeScript, targeted ESLint, production build and `git diff --check` passed. Sixty HTTP-rendered preview checks passed across the seven templates, PC/tablet/mobile device parameters, Korean/English, portrait-tablet parameters and fill mode; Display, both dining multi-page templates and the legacy REAL MATCHA multi-page fixture were excluded. These requests do not create real browser viewports or settle the client fit engine.

Automated contract tests, type checking, lint/build and HTTP-rendered source checks are not substitutes for settled browser layout checks. The browser automation URL restriction from prior work remains unresolved, so do not claim final PC/tablet/portrait/mobile clipping or visual QA for this rollout. User approval of KOHI does not establish visual approval for the other six templates.
