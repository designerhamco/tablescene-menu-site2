# CafeB Restart Checklist

## 1. Why CafeB is being restarted

CafeB should be restarted because the previous CafeB work mixed layout engine decisions, visual skin changes, and fit/fill tuning in the same surface.

That made the template harder to reason about and allowed repeated fixes to drift away from the stable CafeA Basic behavior.

CafeA is the current Basic baseline. CafeB should restart from that baseline and change only what belongs to CafeB's visual identity and sample content.

This checklist is a guardrail document. It does not create CafeB and does not change CafeA.

## 2. Core principle: CafeA engine + CafeB skin

CafeB must be built as:

```text
CafeB = CafeA Basic engine rules + CafeB skin tokens + CafeB starter/demo data
```

CafeB must not introduce a new layout engine unless CafeA's engine rules are explicitly proven incompatible and the reason is documented first.

The selected column count is an output of the engine. It is not the design goal. The design goal is a stable, uncropped, readable Basic menu board that follows CafeB's visual skin.

## 3. What must be reused

CafeB should reuse the Basic rules documented in `docs/basic-template-engine-rules.md`.

Reusable areas:

- Basic layout mode normalization.
- Basic default layout mode policy.
- `orderedBalancedFit` category block partition principles.
- `orderedFit` registration-order flow principles.
- Shared `fontScale` and `gapScale` policy.
- No per-column scale.
- Mobile vertical scroll policy.
- Desktop/tablet no crop and no page scroll policy.
- Right-edge safety checks.
- Price option rendering policy.
- Badge/capability gating policy.
- Representative QA viewport policy.
- Final DOM sweep policy for layout-risk changes.

CafeB should inherit the same customer-facing layout modes:

- `orderedBalancedFit`: 묶음형 자동 배치
- `orderedFit`: 채움형 배치

## 4. What CafeB may customize

CafeB may customize skin and content.

Allowed CafeB skin areas:

- Background color and board surface.
- Cover rail or visual accent treatment.
- Category divider style.
- Category title visual styling.
- Badge/chip shape and color.
- Price chip style.
- Typeface multiplier or skin-level typography accent, if it preserves Basic hierarchy.
- Starter/demo/reset sample data.
- Template-specific descriptive copy.

Allowed CafeB data areas:

- Template key and metadata.
- Starter preset menu categories and items.
- Demo preview data.
- Featured item choice, if the template supports one.
- CafeB-specific images or sample labels.

Any skin customization must preserve the Basic engine's structural rules and safety checks.

## 5. What is forbidden

Do not add a CafeB-specific layout engine.

Forbidden implementation patterns:

- `CafeBOrderedFitController`.
- `CafeBBalancedFitController`.
- Separate CafeB-only fit/fill scoring when the CafeA Basic engine can handle the case.
- Treating 3 columns, 4 columns, or any fixed column count as the goal.
- Candidate-specific page padding changes.
- Candidate-specific column gap changes.
- Candidate-specific brand-to-menu ratio changes.
- Making `orderedFit` and `orderedBalancedFit` look like different designs.
- Hiding crop with `overflow-hidden`, `clip`, or similar masking and treating it as success.
- Pasting raw Stitch HTML/CSS directly into production renderer code.
- Reintroducing legacy `balanced` or `balancedExperimental` as customer-facing options.
- Changing CafeA behavior while building CafeB.
- Changing DisplayMenuA or `display_menu_a`.
- Changing DB schema.
- Changing payment/apply flow.
- Editing existing customer data.

Do not solve a CafeB visual problem by weakening the Basic safety rules.

## 6. Layout mode policy

CafeB must expose the same two Basic layout modes.

### orderedBalancedFit / 묶음형 자동 배치

This is the default mode.

Rules:

- Preserve category registration order.
- Preserve item order inside each category.
- Keep category blocks intact.
- Do not split a category block across columns.
- Use contiguous category partitions only.
- Every column starts with a category title.
- Do not create item-only column starts.
- All columns share one `fontScale` and one `gapScale`.
- Avoid crop, overflow, and desktop/tablet page scroll before optimizing fill.

### orderedFit / 채움형 배치

This is the secondary mode.

Rules:

- Preserve registration order.
- Use the Basic registration-order flow policy.
- Category and menu flow may continue into the next column.
- Do not repeat category titles just to make columns look balanced.
- All columns share one `fontScale` and one `gapScale`.
- Avoid crop, overflow, and desktop/tablet page scroll before optimizing fill.

Both modes must use the same CafeB visual shell.

## 7. Visual shell invariants

CafeB layout modes may distribute content differently, but they must look like the same template.

Invariant shell rules:

- Same outer board structure.
- Same desktop/tablet board rhythm.
- Same mobile scroll policy.
- Same page padding rhythm unless a documented safety correction is required.
- Same brand/cover/menu area relationship.
- Same menu area width policy.
- Same column gap rhythm.
- Same category gap rhythm.
- Same category-title-to-items rhythm.
- Same row rhythm.
- Same text block to option price block relationship.
- Same menu title, secondary name, description, price, and chip hierarchy.
- Same divider language.
- Same badge/chip visual language.

If switching layout modes makes CafeB feel like a different design, the shell is not stable enough.

## 8. Implementation order

CafeB should be rebuilt in small, reviewable steps.

Recommended order:

1. Create a CafeB component skeleton based on the CafeA structure.
2. Connect the CafeB `template_key` and renderer path.
3. Add CafeB skin tokens only.
4. Add CafeB starter/demo/reset sample data.
5. Implement or connect `orderedBalancedFit` first.
6. Implement or connect `orderedFit` second.
7. Verify visual shell consistency between both modes.
8. Run right-edge, crop, overflow, and scroll QA.
9. Verify no CafeA or DisplayA impact.
10. Commit only after the scope is clean.

Do not tune all layout, skin, data, and editor behavior in one commit.

## 9. QA policy

Use representative QA first. Use broad DOM sweeps only when layout, fit/fill, crop, or overflow risk changes.

Representative visual QA viewports:

- 1440
- 1280
- 1024
- 768
- 390

Additional problem viewports:

- 1366
- 1240
- 900

Final DOM sweep viewports:

- 1440
- 1366
- 1320
- 1280
- 1240
- 1200
- 1180
- 1140
- 1100
- 1060
- 1024
- 1000
- 960
- 900
- 834
- 768
- 390

Required checks:

- No horizontal overflow.
- No desktop/tablet page scroll.
- No desktop/tablet crop.
- No mobile horizontal overflow.
- Mobile vertical scroll remains available.
- Last visible item is not clipped.
- Last visible price is not clipped.
- Category title is not orphaned in `orderedBalancedFit`.
- Right-edge safety gap is satisfied.
- No ellipsis as a normal layout solution.
- `orderedFit` and `orderedBalancedFit` share the same visual shell.
- CafeA preview still works.
- DisplayA preview still works.

Do not run full screenshot QA for every small change. Use full visual sweeps only before a CafeB milestone commit or after a layout-risk change.

## 10. Codex prompt checklist

Use this checklist before asking Codex to restart CafeB.

- Read `docs/basic-template-engine-rules.md` first.
- Read `docs/cafe-b-restart-checklist.md` first.
- Treat CafeA as the stable Basic engine baseline.
- Build CafeB as CafeA Basic engine plus CafeB skin tokens plus CafeB starter/demo data.
- Do not create a new CafeB layout engine.
- Do not create CafeB-specific fit/fill controllers.
- Do not target a fixed column count as the design goal.
- Do not paste raw Stitch HTML/CSS directly into the renderer.
- Keep `orderedBalancedFit` as the default.
- Keep `orderedFit` as the secondary option.
- Preserve category order.
- Preserve item order.
- Keep category blocks intact in `orderedBalancedFit`.
- Do not split category blocks in `orderedBalancedFit`.
- Keep all columns on the same `fontScale` and `gapScale`.
- Preserve mobile vertical scroll.
- Preserve right-edge safety checks.
- Preserve price option cap and rendering policy.
- Keep both layout modes in the same visual shell.
- Do not modify CafeA while implementing CafeB.
- Do not modify DisplayMenuA.
- Do not modify DB schema.
- Do not modify payment/apply flow.
- Do not modify existing customer data.
- Start with representative QA before broad sweeps.
- Run final DOM sweep only for layout-risk changes or milestone validation.
- Commit CafeB work in small, separable steps.
