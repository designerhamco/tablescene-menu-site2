# KOHI featured illustration

Generated with the built-in image-generation tool on 2026-10-12, using the user's supplied illustration as a style reference. The original generated PNG is copied without alteration into `public/menu-templates/cafe_kohi_a/kohi-coffee-crocodile-illustration.png`.

Starter contract: one image-only slide, no linked item/name/price/chip, visible on PC/tablet/mobile. Existing menu content, localization, logo, typography, time sale and the common price/fit/spacing logic are unchanged. Existing saved customer menus are not rewritten.

An asset-specific `object-fit: contain` rule preserves the whole character in the wider portrait-tablet scrolling header. The image frame's size and layout are unchanged; future customer photographs retain the existing `cover` behavior.

## Local verification

PC 1440×900, tablet 1198×838 (grouped/fill), portrait tablet 838×1198 and mobile 390×844 all retained one loaded image, zero featured product-copy blocks, zero slide controls, five categories and all 17 menu items. English/Chinese/Japanese grouped tablet previews retained the same image-only presentation and settled to `ready`. Horizontal overflow and the first-line price-alignment check remained clear; no browser error/warning logs were observed. Portrait/mobile screenshots confirmed the whole face, hands and cup remain visible after the asset-scoped contain rule.

544 tests, TypeScript, targeted ESLint, production build and whitespace checks passed. Existing commits were synchronized with the remote branch before this change was committed. Production status must be checked separately after push.

## Final generation prompt

Use case: illustration-story. Asset: a single portrait cafe-menu featured illustration for KOHI. Input Image 1 is a STYLE REFERENCE, not a crop to enlarge. Create a fresh, original character illustration that closely shares its naive hand-cut / rough linocut screenprint aesthetic: an affable black crocodile enjoying coffee, oversized white eyes with short brick-red pupils, a long friendly snout with a small goofy toothy grin, a pale belly carrying sparse hand-drawn dark scale marks, holding one simple white coffee cup with a tiny red accent. Slightly redesign the silhouette, facial proportions and arm pose, keeping the same uncomplicated witty spirit. Flat near-black ink, warm off-white paper background matching #f7f5f1, and sparse KOHI red #dc4235 accents only. Coarse dry-ink speckles, irregular hand-drawn edges, a charming editorial illustration rather than smooth vector clip art. Portrait composition approximately 4:5; show the entire upper body, both hands and the complete coffee cup, with comfortable paper margins on all sides so nothing important is cropped in a tall image panel. The character should occupy most of the canvas; strong readable silhouette at small tablet menu size. No scene, no extra characters, no border, no shadows, no gradient, no text, no logo, no typography, no watermark. This illustration will be displayed by itself, with no product title or price over it.
