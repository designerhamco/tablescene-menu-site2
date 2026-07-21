# CafeA Widget MVP Data Contract

## 1. MVP Goal

CafeA widget MVP adds simple visual content blocks that can be mixed with menu categories on a menu page.
The rendering experiments have established three layout policies:

- Desktop/tablet ordered balanced: categories and widgets are atomic blocks.
- Desktop/tablet ordered fill: categories may split across CSS columns, widgets remain atomic.
- Mobile: categories and widgets render in source order as one vertical flow.

This document defines the application domain contract only. It does not apply a DB migration, loader query,
editor UI, save action, starter data, or template capability.

## 2. Widget Types

Supported MVP widget types:

- `image`
- `text`
- `image_text`

Legacy database values such as `notice_text`, `image_banner`, `option_list`, and `store_info` are not part of the
new runtime MVP contract. They must be audited before the next migration.

## 3. Aspect Ratio

Supported ratios:

- `2:1`
- `3:2`
- `4:3`
- `1:1`
- `3:4`

`3:4` is allowed, but treated as an emphasis ratio. The editor should use it deliberately because it takes more
vertical space, especially on mobile.

## 4. Page Limit

A menu page can have up to 3 widgets.

Hidden widgets count toward the limit because they can be shown again later. Other menu pages are counted
separately.

## 5. No Column Span

Widgets do not support column span in the MVP. A widget occupies one menu column track on desktop/tablet and full
mobile width on mobile.

## 6. Atomic Policy

Each `menu_widgets` row is one atomic visual box.

- `image`: media-only atomic box
- `text`: text-only atomic box
- `image_text`: media area plus text area in one atomic box

Widgets must not split between columns. Categories may split only in ordered fill.

## 7. DB Columns And Settings

General content is stored in regular DB columns:

- `widget_type`
- `title`
- `description`
- `image_url`
- `image_path`
- `sort_order`
- `visible`
- `menu_site_id`
- `menu_page_id`

Presentation options are stored in `settings jsonb`:

- `schemaVersion`
- `aspectRatio`
- `objectFit`
- `textAlign`
- `altText`

Unneeded settings are removed during normalization. For example, a text widget does not persist image ratio or
alt text settings.

## 8. Settings Schema Version 1

`settings.schemaVersion` is always `1` for the MVP.

Type-specific settings:

- `image`: `aspectRatio`, `objectFit`, optional `altText`
- `text`: `textAlign`
- `image_text`: `aspectRatio`, `objectFit`, `textAlign`, optional `altText`

## 9. Required Fields

`image`:

- Requires either `imageUrl` or `imagePath`.
- Requires valid `aspectRatio` and `objectFit`.
- Persists `title` and `description` as `null`.

`text`:

- Requires either `title` or `description`.
- Requires valid `textAlign`.
- Persists image fields as `null`.

`image_text`:

- Requires either `imageUrl` or `imagePath`.
- Requires either `title` or `description`.
- Requires valid `aspectRatio`, `objectFit`, and `textAlign`.

The widget lab allows missing-image fallback for visual QA, but final editor save validation should reject
missing images for `image` and `image_text`.

## 10. Validation Limits

Initial limits:

- Title: 60 characters
- Description: 300 characters
- Alt text: 120 characters

These limits live in `lib/menu-widgets.ts`.

## 11. Category And Widget Sort Order

Categories and widgets share the same `menu_page_id + sort_order` ordering space.

Example final sequence:

```text
0 category
1 widget
2 category
3 widget
4 category
```

The stable sort policy is:

- Sort by `sortOrder` ascending.
- If sort values are equal, preserve input order.
- Do not sort by name or ID as a hidden fallback.

## 12. Save-Time Reorder

Before final save, one page's combined category/widget blocks should be normalized to contiguous `sortOrder`
values from `0` to `n - 1`.

The helper must not mutate input objects. Mixed page IDs should fail validation or throw in normalization.

Existing category-only reorder actions do not know about widgets yet. A later save step must replace them with a
combined content-block reorder flow.

## 13. Why There Is No `menu_page_blocks` Table

The MVP does not introduce a separate `menu_page_blocks` table.

Reasons:

- Existing `menu_categories` and `menu_widgets` already have `menu_page_id` and `sort_order`.
- A third source of truth would create synchronization risk.
- The MVP allows only 3 widgets per page, so merge complexity is low.
- A merged loader and combined save validation are enough for this scope.

Tradeoffs:

- The DB cannot enforce cross-table `sort_order` uniqueness by itself.
- Server save actions must validate combined category/widget order.
- Category-only reorder actions cannot remain the final implementation.
- Copy, reset, delete, and hard-delete must handle both tables together.

## 14. `menu_widget_items` Policy

MVP:

- `menu_widgets` one row equals one atomic box.
- `image`, `text`, and `image_text` all render from that one row.
- `menu_widget_items` is not queried by MVP loader/editor/save.

Future:

- Carousel widgets
- Multi-card widgets
- Link lists
- Option lists
- Widgets with multiple child content records

Existing table treatment:

- Do not drop `menu_widget_items`.
- Keep cleanup and hard-delete support.
- Reconsider it when a multi-item widget type is introduced.

## 15. Rendering Policy

Desktop/tablet ordered balanced:

- Categories and widgets are atomic blocks.
- Column assignment is chosen by the balanced layout helper.

Desktop/tablet ordered fill:

- CSS multi-column remains active.
- Categories may split across columns.
- Widgets use `break-inside: avoid` and move as whole blocks.

Mobile:

- Ignore desktop/tablet layout mode.
- Render category/widget blocks in source order.
- Every visible category displays a divider, including the last category.
- Vertical page scroll is allowed.
- Horizontal overflow and nested scroll are not allowed.

## 16. Future Migration Needs

The current DB `widget_type` check constraint reportedly allows legacy values:

- `notice_text`
- `image_banner`
- `option_list`
- `store_info`

The new MVP contract needs:

- `image`
- `text`
- `image_text`

Next step should be a read-only DB audit:

- Count existing `menu_widgets` rows by `widget_type`.
- Check whether legacy rows exist in production data.
- Check whether any `menu_widget_items` rows are still referenced.
- Decide whether to add new values alongside legacy values or backfill legacy values before tightening.

Recommended migration direction:

- Do not remove legacy enum/check values until read-only audit proves they are absent or safely backfilled.
- Prefer adding new MVP values first if legacy rows may exist.
- Tighten constraints only after data cleanup/backfill is explicit.

## 17. Future Editor And Save Work

Later stages must add:

- Owner/public loader query for `menu_widgets`
- Editor draft state and image upload flow
- Server save validation using the helpers in `lib/menu-widgets.ts`
- Combined category/widget reorder save
- Copy/reset/delete behavior for widget rows and images
- Storage cleanup policy after image replacement or widget deletion

Storage cleanup is intentionally out of scope for this contract step.
