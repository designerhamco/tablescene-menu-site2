# MELLOW left-logo starter QA — 2026-11-10

The existing `cafe_mocha_forest_a` registration keeps MELLOW's native palette and content, with the left-logo top-row list composition on PC/tablet. The resized supplied PNGs are copied unchanged to new asset URLs; the old bundled representative image is deleted. Representative area and secondary names start OFF. Preview ON shows a blank representative frame or registered translated secondary copy. Native sale-chip foreground matches ordinary-chip foreground; explicit saved/preview chip colors remain authoritative.

Validation:

- `npm test`: 1,178 passing tests, including catalog/provisioning parity, reset settings, retained translation examples and chip-color fallback/overrides.
- `npx tsc --noEmit`, targeted ESLint, `npm run build` (including `check:site-ui`): passed.
- `scripts/qa-mellow-presentation.mjs`: 21 MELLOW scenarios (PC1512/1920, tablet1180/1024, mobile320/390/430, grouped/fill, Call, locales and design overrides), plus unchanged DOM geometry/ink/type/content comparisons for the other six native Basic templates. Left logo, far-right description/language, final-column notices, divider ink and ordinary/sale foregrounds are checked.
- `scripts/qa-mellow-left-logo.mjs`: six actual viewport/option combinations, including mobile empty-cover ON and secondary ON, tablet text-brand fallback, popup/header stability and deleted image HTTP404. No browser errors or API writes.
- `scripts/qa-mellow-preview-options.mjs`: real viewing-options controls start representative/secondary OFF and logo/widget ON. Checks reveal the empty frame and translated secondary rows, then hide both again. Category color apply/reset updates native column dividers; fixed header alignment remains protected.

Local final checks use the production build served at `http://localhost:3027`. The preview shell and actual renderer both read the same starter defaults. Customer data is not migrated or written by these checks. Old logo/widget URLs remain available for existing saved references; the requested representative photograph is removed.
