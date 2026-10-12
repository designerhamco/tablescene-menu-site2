<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Menu layout boundaries

- Before changing templates, read `docs/template-spacing-contract.md`. PC/tablet single-page fit is one policy; mobile single-page reading is a separate policy with its own numeric tokens. Never let a PC/tablet fit, density, fill or semantic-ratio change alter mobile sizing/spacing.
- The seven active single-page mobile templates share the approved 20px item / 24px heading / 48px section defaults (rem-based). Measure colored upper boxes and separator stroke edges, not just text bounds. Preserve menu order, price/name alignment and desktop notice anchors.
- Display and multi-page engines are excluded from this mobile rollout. All seven mobile templates use 14px notices, 26px category titles and a shared text-brand fit with a hard 44px minimum. Prefer a single line up to 100% width but stop at the width-relative visual ceiling (88px at 342px inner width); balanced multiple lines use a 75% soft target and a 64px ceiling at that inner width. Minimum size, whole-text preservation and visual ceiling take priority over an impossible coverage percentage. No old template-specific title/category/notice size corrections may override these values. Notice rows use normal supporting-copy line-height with zero paragraph gap. Logos bypass text fitting. PC/tablet title fitting is not enabled; wait for the user's separate PC/tablet specification.
- Mobile internal copy gaps are also shared: item title/secondary/description boundaries 2px, category title/description 8px, brand/description 12px, upper content blocks 24px. All supporting copy uses line-height 1.5. Language controls must use script-aware text with the saved/starter Korean and English font variables, never hardcoded font names. Decorative stroke offsets remain distinct from whitespace measured after a stroke.
- Verify all affected mobile templates, narrow/wide phone widths and relevant locales, plus PC/tablet and excluded-engine regressions. Record actual DOM viewport dimensions, not just requested sizes; wait for the rendered layout/fonts to settle before claiming success.
