# Single-page proportion-first behavior — 2026-10-11

## Approved scope

User approved the KOHI tablet result, then requested common principles only for other templates. Apply to REAL MATCHA, KOHI, Mocha Forest, Sunday Roasters, Van Gogh, Rosy Orange and Loop Bagel. Do not copy KOHI's numeric calibration or change starter menus, role proportions, brand/heading colors, fonts, images, widget ratios or notices. Display/multi-page and retired/coming-soon renderers are excluded.

## Shared behavior

- Primary fit keeps existing candidate ceilings and template-specific gap mapping. KOHI's `1.20` tablet / `1.24` PC ceilings and Loop Bagel's screen/font spacing formula remain exclusive to those templates.
- All seven skip post-fit whitespace enlargement and final-fill font/gap boosts. Residual whitespace is acceptable when bounded proportions and readability are already good.
- Between-item spacing uses the template's existing base rhythm: both supporting fields visible = `1×`, one = `1.15×`, neither = `1.35×`. Active promotion support, origin or traits keep normal rhythm. Visibility is derived from the localized rendered row.
- The CSS multiplier applies once, only to non-last items on PC/tablet (including portrait-tablet scroll), not mobile. Mobile now has the separate `mobile-reading` contract described in `docs/template-spacing-contract.md`; the earlier mobile rollout was an implementation error corrected on 2026-10-12.
- Category order/merging, preferred/rescue column tiers, wrap-density penalties and reductions, price alignment/option headers, fixed-shell brand placement, final-column footer docking and DOM-crop/loading safeguards remain active.
- The shared gate is explicit and tested against the current active dining single-page catalog. A future active single-page template must opt in and pass that coverage test rather than silently inheriting an unverified calibration.
- Legacy REAL MATCHA multi-page presentations reuse CafeA internally. They now identify their presentation as `multi` instead of `one`, so the common single-page policy is excluded. This flag is passed directly to CafeA (not back through the dispatcher); navigation, pagination and layouts are unchanged.

## 2026-10-12 correction

The old root declared `--cafe-a-copy-aware-item-rhythm-gap: var(--cafe-a-local-item-rhythm-gap)` before the referenced local token existed. CSS resolves aliases where declared, not later on descendants. Thus mobile 1.15×/1.35× rows computed invalid margins (0px). Baseline 1× rows did not use that alias and masked the defect in full-copy starter templates. It reproduced in KOHI, Mocha Forest, ROSY ORANGE and Loop Bagel; the remaining three had the same latent risk when supporting copy was hidden.

The alias is now declared on the item stack itself (and uses the board rhythm only inside the desktop board). Root flags explicitly separate PC/tablet copy-aware rhythm from stable mobile reading style using the existing resolved device hook. Display/multi-page/inactive engines do not opt in. Mobile has an 18px default item gap, fixed rem type bases and a section token shared by upper-to-first-menu and category/widget/footer boundaries. Fonts/colors/images/order, desktop footer docking, preferred/rescue columns, fit limits and overflow safeguards are preserved.

Rendered mobile checks on all seven templates passed at 320×700, 390×844 and 430×932 with full/title-only/description-only/secondary-only fixtures: each between-item gap was 18px, typography sizes did not vary by viewport and upper/category boundaries matched. The fixture is local-only and does not modify starter or saved data. The new DOM checker and regression tests reject zero gaps, invalid tokens, device-policy leakage and viewport-dependent mobile scaling. Current settled PC/tablet and deployed checks are recorded in `docs/one-page-mobile-rhythm-qa.md`.

## Earlier verification boundary (history)

Final local checks: `npm test` passed 536 tests; TypeScript, targeted ESLint, production build and `git diff --check` passed. Sixty HTTP-rendered preview checks passed across the seven templates, PC/tablet/mobile device parameters, Korean/English, portrait-tablet parameters and fill mode; Display, both dining multi-page templates and the legacy REAL MATCHA multi-page fixture were excluded. These requests do not create real browser viewports or settle the client fit engine.

Automated contract tests, type checking, lint/build and HTTP-rendered source checks are not substitutes for settled browser layout checks. The browser automation URL restriction from prior work remains unresolved, so do not claim final PC/tablet/portrait/mobile clipping or visual QA for this rollout. User approval of KOHI does not establish visual approval for the other six templates.
