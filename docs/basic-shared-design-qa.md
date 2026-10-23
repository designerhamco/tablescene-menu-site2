# Shared Basic fonts and representative geometry — 2026-10-23

Scope: the six default Basic list/album presentations and seven native designer skins. Customer content, schema, payment/auth policy and independent mobile reading geometry are unchanged. The final contract is at the top of `template-spacing-contract.md`.

## Verification

- 820 unit tests pass, including common-font persistence/legacy override removal, color/weight preservation, title hierarchy and emergency grapheme wrapping, surface save/clear/defaults and existing owned Design save/reset paths.
- Separate TypeScript and Production webpack build pass. ESLint has no errors; its two existing warnings are in `apply-launch-copy.test.ts` and `qa-customer-call-status.mjs`.
- Browser checks use actual DOM viewport dimensions and rendered fonts. PC 1280×720 and tablet 1180×820 cover all 13 presentations with an auxiliary color and Alata. Left colored panels reach y=0 and the full viewport bottom; top colored headers reach x/y=0 and the full width. Cover frames keep the full inner rail width.
- Basic first/top/center and list/album shared paths retain category size 34.56px PC / 33.28px tablet. The title floor recomputes from actual headings (43.2px / 41.6px), including late-mounted headings and font changes. The renderer observes heading layout/mounts, never sale countdown ticks.
- Representative first-column default: PC photo 235.52×397.39px, tablet 206.05×508.34px. Top-row header: PC 1280×247px, tablet 1180×234px; the following gap starts at the painted bottom edge. These are measured outcomes, not font-specific constants.
- `Incomprehensible`, `CAFE ARTIMENU` and a long Korean title were checked in the local fixture at 1440×900 and portrait tablet 768×1024, on first-column and top-row structures. Whole text remains visible; single words can split safely when they cannot fit at the minimum. Title space grows while photo width stays fixed. At 1280×720, `Incomprehensible` renders as `Incompre` / `hensible` at 56.34px with a 235.52px-wide image below.
- The native ONUE flow/photo block also releases its PC/tablet aspect ratio and grows for overlay content, retaining its controls, centered identity and following menu flow. Mobile remains square. Loop's full-height color paint remains below its checker decoration and reserves checker clearance internally.
- Final Production-build portrait tablet check: all seven native skins at actual 768×1024; category-relative minimum is 41.6px, photo widths remain full rail widths, and no document overflow occurs.
- Absent and explicit page-equal auxiliary colors release the colored geometry in first-column/top-row designs. The editor no-fill swatch remains distinct from explicit white. Native Mocha/ROSY defaults remain available.
- Actual preview UI has exactly one common Korean and English selector and separate role color controls. Changing to Noto Serif KR / Carme updates brand and categories together; store introduction uses Noto Serif KR for both scripts.
- Local editor fixture uses the actual form components with legacy role fonts. It exposes two common pickers; selecting Carme updates the mini preview. Auxiliary HEX changes remain pending until Apply. Hidden submission fields are validated by SSR/unit tests; no customer record is written for QA.
- Mobile: all 13 presentations at actual 390×844, plus all seven native skins at 320×844 and 430×844. Categories remain 26px, brand minimum/ceilings stay mobile-owned, and no horizontal overflow occurs. Representative photos retain original ratios: normally 4:5, neutral upper-left 4:3, native ONUE 1:1. The mobile title fitter and reading tokens are unchanged.
- Production-build smoke: Dining A PC, Dining B mobile, Display PC and Basic multi-page retain their separate renderers (no canvas title fitter). The local-only `/__qa/basic-design` fixture returns 404 in Production.

Local evidence: `/private/tmp/shared-basic-production-build.json`, `/private/tmp/shared-basic-long-title.json`, `/private/tmp/shared-basic-mobile.json`, `/private/tmp/shared-basic-mobile-widths.json`. Local snapshots are QA artifacts, not uploaded customer data.
