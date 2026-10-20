# Template typography parity — 2026-10-20

The approved Basic and Dining default designs are the reading-size references for their respective families. Native fonts, weights, colors, structural panels, image ratios, category spacing and independent mobile reading remain intact.

## Differences found and removed from active reading

| Previous difference | Current policy |
| --- | --- |
| Basic neutral list products used 94%; designer and album products used 100% | All Basic PC/tablet products and featured products use the same 94% role |
| Mocha supporting copy used an extra .96 | Common .72 supporting ratio without a skin multiplier |
| Mocha tablet had .97 corrections, still affecting price notes/options | Common device option scale; no extra Mocha correction |
| Loop's .85 correction still affected some option labels | Same device option scale as Basic defaults |
| Tablet secondary copy used .63 on Matcha/Mocha/Loop but .64 elsewhere | Common .63 tablet and .64 PC ratio |
| Some native price-option labels retained fixed 9.28/10px sizes | One reference/product-linked option/price-note rule; long labels reserve intrinsic width and a .625rem gap |
| Dining neutral product roles alone had an extra .94 | All Dining PC/tablet use `1.06 × .94` |

Basic reference ceilings remain PC 1.35rem / tablet 1.30rem; product roles use 94% with a 1rem floor. Categories retain reference ×1.6. Supporting/secondary roles retain a .75rem floor. Option/price-note roles use reference/product size × .56 PC / .53 tablet, floor .625rem. Featured identity over ONUE photography is store copy, not a product role.

Mobile Basic retains 16px names/prices, 12px secondary, 14px descriptions and 26px categories at a 16px root. Existing 20/26/48 item/heading/section rhythm and internal copy gaps do not change. Dining retains its independent mobile item/price/course reading tokens. Customer role size settings and the shared two-field 5% supporting exception remain semantic rules, not template-name exceptions.

Display, inactive layouts and the Brew multi-page renderer retain their separate contracts; they do not inherit active Basic contained-reading tokens. Native brand typography and Dining cover/page title styling remain design identity rather than product-size overrides.

## Verification

`scripts/qa-template-typography-parity.mjs` compares actual rendered name, secondary name, description and price sizes against each family's default design across seven Basic skins, two Dining skins, ten default/album variants and PC/tablet/mobile. It also checks Basic grouped/fill parity and live Loop checker recoloring without geometry changes. Existing native layout QA separately checks order, columns, complete content, fixed actions and mobile rhythm. All measurements wait for actual viewport, layout and font settlement.

Candidate measurements observe their real viewport, incoming content, font readiness and image load events. Hidden probe rows are measurement outputs and no longer trigger their own next measurement. Both native and Matcha readers restore final-width chip measurements after probing. The browser parity check samples sixteen consecutive animation frames to reject changing column choices or moving item geometry after settlement.
