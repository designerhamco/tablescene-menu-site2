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

## 15. DB Row And Domain Mapping

Supabase generated types expose `menu_widgets.widget_type` as `string`, so DB rows must not be cast directly to
`MenuWidget`.

Required boundary:

```text
Supabase menu_widgets Row
→ runtime widget_type and settings validation
→ valid image/text/image_text rows become MenuWidget
→ invalid or legacy rows become structured issues
```

Runtime policy:

- New runtime supports only `image`, `text`, and `image_text`.
- Legacy values `notice_text`, `image_banner`, `option_list`, and `store_info` are not automatically converted.
- A legacy row should produce an issue such as `UNSUPPORTED_LEGACY_TYPE` and be excluded from rendered widgets.
- Unknown widget types should produce `INVALID_WIDGET_TYPE`.
- Loader/editor/save code should use the mapping helpers instead of trusting generated `string` values.

Settings policy:

- `settings` must be a plain JSON object when present.
- `schemaVersion: 1` is the only supported explicit version.
- Missing or empty settings may be completed with V1 defaults:
  - `image`: `aspectRatio: "2:1"`, `objectFit: "cover"`
  - `text`: `textAlign: "left"`
  - `image_text`: `aspectRatio: "4:3"`, `objectFit: "cover"`, `textAlign: "left"`
- Unsupported explicit schema versions fail parsing instead of being coerced to V1.
- Unknown settings keys are ignored during mapping.
- Expected settings values must be primitive strings; nested objects/arrays are invalid for MVP settings fields.

Payload policy:

- Insert payloads are created from validated drafts, normalized domain widgets, and snake_case DB fields.
- Update payloads do not include `id` or `menu_site_id`.
- Update payloads include `menu_page_id` only when the caller explicitly opts in for a combined reorder/save flow.
- Type changes must clear stale DB fields with explicit `null`, not `undefined`.
- Settings are serialized to the minimal V1 object for the widget type; empty `altText` is not persisted.
- DB writes are still reserved for later server actions.

Ordering policy:

- Category and widget blocks share one page-level order.
- Server save should create a combined category/widget order update plan and assign `sortOrder` as `0..n-1`.
- Hidden blocks remain part of the saved order.

Delete and asset policy:

- Delete planning records `widgetId`, `menuSiteId`, `menuPageId`, and `imagePath`.
- `imagePath` is the storage cleanup key. Do not infer storage paths from `imageUrl`.
- Asset diffing may mark a previous image path for cleanup when the next widget path differs or the widget becomes text-only.
- Actual DB delete and Storage cleanup are later server-action work and must not run from pure mapping helpers.

## 16. Server Persistence Service Policy

The first server persistence layer is an internal server-only module. It is not a server action, API route,
editor mutation, public loader, or template renderer integration point yet.

Required ownership boundary:

- Authenticate the current user with the standard Supabase server client.
- Load `menu_sites` by `id` and `user_id`; do not trust a client-provided `menuSiteId` alone.
- Check the menu site access state before write operations.
- Verify that `menu_pages.menu_site_id` matches the owned `menu_sites.id`.
- Verify that a loaded widget row belongs to the same `menu_site_id` before update or delete.

CRUD support:

- Only new MVP types `image`, `text`, and `image_text` can be created or updated.
- Legacy rows are not automatically converted, modified, or deleted by the MVP service.
- List operations return valid MVP widgets plus structured parse issues for legacy/invalid rows.
- Create and page-move update operations count hidden widgets toward the per-page maximum of 3.
- Update payloads clear stale image/text fields through the mapper when a widget changes type.
- Delete returns a delete plan with the image path, but does not remove Storage files.

Asset and cleanup policy:

- Image cleanup runs only after all widget DB mutations and category/widget order RPC writes succeed.
- The service may return an asset-change plan when a widget's `imagePath` changes.
- Do not infer Storage paths from `imageUrl`.
- Do not call Storage `remove()` from the persistence service; the action layer delegates post-save cleanup to a server-only cleanup service.

Ordering and revalidation policy:

- Combined category/widget order writes remain intentionally out of scope.
- Category rows and widget rows live in different tables, so a combined order save should be atomic.
- A later SQL RPC transaction is the preferred direction to update both tables together.
- Sequential Supabase JS updates with manual compensation are a fallback only, because partial failure could corrupt
  the public order.
- Revalidation belongs to the later server action wrapper that calls this service. The persistence service itself
  should only read/write DB rows and return plans/results.

Known concurrency gap:

- The DB currently does not enforce a per-page maximum of 3 widgets.
- Server-side count-before-insert/update validation protects normal UI flows, but concurrent requests can still race.
- A future RPC/advisory-lock or constraint-backed approach should close this gap before high-volume widget writes.

## 17. Shared Category/Widget Order RPC

Categories and widgets share one `menu_page_id + sort_order` ordering space, but they live in separate DB tables.
To avoid partial ordering writes, the combined order must be saved through a dedicated SQL RPC:

```text
public.save_menu_page_content_order(
  p_user_id uuid,
  p_menu_site_id uuid,
  p_menu_page_id uuid,
  p_blocks jsonb
)
```

RPC responsibility:

- Save only category/widget `sort_order` values.
- Verify the menu site belongs to `p_user_id`.
- Verify the menu page belongs to the menu site.
- Lock the `menu_pages` row with `select ... for update`.
- Validate the full payload before writing.
- Update `menu_categories` and `menu_widgets` in one PostgreSQL function call.
- Return counts only, not customer content.

Payload contract:

```json
[
  { "block_type": "category", "id": "category-uuid", "sort_order": 0 },
  { "block_type": "widget", "id": "widget-uuid", "sort_order": 1 }
]
```

Validation policy:

- `p_blocks` must be a JSON array of objects.
- `block_type` must be `category` or `widget`.
- `id` must be a valid UUID.
- `sort_order` must be an integer.
- `sort_order` values must be exactly `0..n-1`.
- Duplicate `(block_type, id)` pairs are rejected.
- Duplicate sort orders are rejected.
- The payload must contain the page's full category/widget block set.
- Hidden categories/widgets are included.
- Unknown IDs, missing DB rows, and rows from another page or menu site fail the whole save.
- Legacy widget types (`notice_text`, `image_banner`, `option_list`, `store_info`) fail the save and require separate review.
- More than 3 widget rows on the page fail the save, including hidden rows.

Security and caller policy:

- The RPC is intended for Next.js server-side `service_role` calls only.
- `p_user_id` must come from the authenticated server session, not from client payload.
- The function also verifies `menu_sites.user_id = p_user_id`.
- `anon`, `authenticated`, and `public` execute privileges are revoked.
- `service_role` is the only execute grantee.
- The migration uses `security invoker`; the server-side service-role caller supplies DB privileges while the function performs explicit ownership checks.
- The function uses a fixed `search_path` and does not rely on `auth.uid()`.
- Because the RPC is `security invoker`, the server-side service-role caller
  must also have the minimum table/column privileges used by the function body.
  These grants are tracked separately from the function creation migration.

Non-responsibilities:

- Widget create/update/delete remains in the server widget persistence service.
- Category create/update/delete remains in the existing menu save flow.
- Storage cleanup remains outside the RPC and is handled only by the server action after all DB/RPC writes succeed.
- Revalidation belongs to the future server action wrapper.
- This RPC does not add entitlement or billing checks; CafeA widgets are part of the free/base feature set.

## 17.5 Final Save Server Contract

The editor-facing final save contract is staged in code before wiring it into
`app/mypage/menus/actions.ts`.

Modules:

- `lib/menu-widget-save-contract.ts`
  - Parses the unknown client payload.
  - Clones the payload into a typed `MenuWidgetFinalSavePayload`.
  - Validates UUID shape, arrays, duplicate IDs, exact `sortOrder` sequences,
    page-level widget count, block/draft consistency, delete conflicts, and
    widget draft domain rules.
  - Does not mutate the original payload.
- `lib/menu-widget-save-plan.ts`
  - Compares parsed drafts with existing DB widgets.
  - Produces create/update/delete buckets, page order payloads, and image asset
    cleanup candidates.
  - Treats same-ID retries as updates, not duplicate creates.
  - Ignores already-missing deleted widget IDs so a retry after a partial delete
    can continue safely.
  - Does not execute DB or Storage operations.
- `lib/server/menu-page-content-order-service.ts`
  - Server-only wrapper for `public.save_menu_page_content_order`.
  - Uses the Supabase admin/service-role client because the RPC grants execute
    only to `service_role`.
  - Maps the RPC response to counts only.
- `lib/server/menu-widget-final-save-service.ts`
  - Server-only orchestration boundary for the future final save action.
  - Authenticates the current user with the normal server client.
  - Verifies menu site ownership, write access, template widget capability, and
    menu page ownership before mutations.
  - Uses existing widget create/update/delete services, then calls the order RPC
    per page.
  - Returns image cleanup candidates but does not delete Storage files.
  - Does not call `revalidatePath`; revalidation remains the action wrapper's
    responsibility.

Payload shape:

```ts
type MenuWidgetFinalSavePayload = {
  widgetDrafts: MenuWidgetDraft[];
  deletedWidgetIds: string[];
  contentBlocksByPage: Array<{
    menuPageId: string;
    blocks: Array<{
      blockType: "category" | "widget";
      id: string;
      sortOrder: number;
    }>;
  }>;
};
```

Save order policy:

1. Parse and validate the full payload.
2. Verify owner/access/template/page boundaries.
3. Load existing widgets and reject invalid or legacy rows.
4. Build a plan before any mutation.
5. Delete widgets requested for removal.
6. Update existing widgets, including page moves.
7. Create new widgets.
8. Save the combined category/widget order through the RPC.
9. Run post-save widget image cleanup for previous stored images that are no longer referenced.
10. Let the action handle cache revalidation and user-facing redirects.

Current integration status:

- The editor hidden input is connected when `menuWidgets.enabled` is true.
- The menu final save action calls the widget final save service only when widget drafts or deleted widget IDs exist.
- Existing zero-widget customer saves continue through the previous save path without invoking the widget RPC.
- The editor can add, select, edit, copy, hide, and delete local widget drafts for supported CafeA pages.
- Pending widget create/copy editors do not enter the hidden final-save payload until the user applies the widget draft.
- No public loader or CafeA renderer reads widgets in production flow yet.
- No end-to-end widget create/update/delete save has been run from the UI yet.
- Widget image cleanup is connected after successful final save, but no real widget UI final save has executed it yet.

## 17.6 Widget Image Upload Boundary

Image-backed widgets use a dedicated server route boundary from the editor draft UI.

Route:

```text
POST /api/menu-widget-images
DELETE /api/menu-widget-images
```

Supported widget types:

- `image`
- `image_text`

The `text` widget type is rejected by the upload boundary.

Path policy:

```text
menu-sites/{menuSiteId}/widgets/{widgetId}/versions/{assetId}.{jpg|png|webp}
```

Rules:

- `menuSiteId` comes from an owned menu site after server-side authentication and access checks.
- `widgetId` must be a UUID. Existing widget rows must belong to the same menu site; a new client-generated widget ID is allowed.
- `assetId` is generated on the server for every upload.
- User filenames, client-selected paths, and bucket names are never trusted.
- Uploads create a new version path and never overwrite the current DB-backed public path.
- The DB points at the new image only after the later final save flow persists the widget draft.

Upload validation:

- Reuses the existing `menu-images` bucket and image upload size/MIME policy.
- Accepts JPEG, PNG, and WebP only.
- Rejects empty files.
- Verifies file bytes with image magic numbers instead of trusting only MIME type or extension.
- SVG and arbitrary files are rejected.
- No new image transform dependency is added in this step; stored extensions match the accepted source format.

Temporary cleanup policy:

- `previousUnsavedImagePath` may be removed only after the new upload succeeds.
- Previous unsaved cleanup is limited to the same `menuSiteId + widgetId + versions/` prefix.
- A DB-referenced `image_path` is never removed by this draft route.
- Cleanup failure logs a warning but does not fail the successful upload response.
- Abandoned draft assets remain orphan candidates for the separate read-only audit and future cleanup flow.

Delete policy:

- DELETE accepts `menuSiteId`, `widgetId`, and `imagePath`.
- `imagePath` is the only cleanup key; never infer a Storage path from `imageUrl`.
- The route verifies owner/write access, widget capability, exact version prefix, current DB image protection, and DB reference protection before `remove`.
- The route is connected to the editor image field for draft upload/remove.
- Real remote upload/remove QA has not been run in this stage.
- The route is not connected to the final save action and does not persist DB rows.

Final-save cleanup remains separate:

- The final save service may return cleanup candidates after DB mutations.
- Actual persisted-image cleanup must be added as a later server-action responsibility.
- This route does not call the category/widget order RPC and does not change DB rows.

## 17.8 Editor Widget Draft UI

The first customer-facing editor step is local-draft only.

Supported editor operations:

- Add a pending widget from the menu structure panel.
- Select an existing widget row and open a widget editor panel.
- Change type between `image`, `text`, and `image_text`.
- Edit visibility, title, description, image settings, text alignment, and alt text.
- Copy an existing widget into a pending editor. Image paths are cleared on copy.
- Delete an existing or unsaved widget from the local final-save payload.

Draft boundary:

- Pending create/copy state is not included in `menuWidgetFinalSavePayload`.
- The widget enters `widgetDraftsById` and the page content block list only after the editor apply action.
- Existing widget edits remain local to the editor until applied.
- The bottom final save remains the only DB persistence path.

Image boundary:

- Image replacement uploads a new version path through `/api/menu-widget-images`.
- If the current image is an unsaved draft image, its path may be sent as `previousUnsavedImagePath`.
- Persisted image paths are never sent as `previousUnsavedImagePath`.
- Removing a persisted image only clears local draft state; Storage cleanup is deferred to final-save cleanup.
- Removing an unsaved draft image calls the draft DELETE route before clearing local state.

Not connected in this stage:

- Public/owner preview loader widget reads.
- CafeA renderer output.
- Real DB final-save QA.
- Real Storage upload/remove QA.

## 17.9 Editor Mixed Content Reorder

The editor structure list treats categories and applied widgets as one page-level content list.

Sortable identity:

- Category: `menu-content:category:{categoryId}`
- Widget: `menu-content:widget:{widgetId}`

Rules:

- Reorder is limited to blocks on the same menu page.
- Items remain category-internal and are not included in the page-level block list.
- Hidden categories and hidden widgets remain in the list and keep reorder support.
- Pending widget create/copy editors are excluded until the widget draft is applied.
- If a widget editor has unapplied local changes, page-level content reorder controls are disabled until the user applies or cancels that draft.
- Reorder normalizes `contentBlockDraftsByPageId`, `categoryBasicDrafts.sortOrder`, and `widgetDraftsById.sortOrder` to the same `0..n-1` sequence.
- The hidden final-save payload is derived from the mixed block list, so category/widget order is preserved without including item rows.

This stage does not click final save, call the content order RPC, write DB rows, or upload/remove Storage objects.

## 17.7 Post-Save Widget Image Cleanup

After a widget final save succeeds, previous stored widget image paths may be removed from Storage.

Cleanup trigger:

```text
widget create/update/delete service success
→ category/widget order RPC success
→ post-save image cleanup
→ revalidate menu paths
→ success redirect
```

Cleanup candidates:

- `MenuWidgetDeletePlan.imagePath` from a deleted widget.
- `MenuWidgetAssetChange.previousImagePath` when an existing widget changes to a different image.
- `MenuWidgetAssetChange.previousImagePath` when an image/image_text widget becomes text-only.

Candidate collection rules:

- `null` paths are ignored.
- Previous and next paths that are identical are ignored.
- Duplicate previous paths are removed; the path is attempted at most once.
- `nextImagePath` is never a delete candidate.
- Candidates retain `menuSiteId` and `widgetId`; the cleanup service does not parse ownership out of URLs.

Safety checks before Storage remove:

- Path must match `menu-sites/{menuSiteId}/widgets/{widgetId}/versions/{assetId}.{jpg|png|webp}`.
- A path from another menu site or another widget is skipped.
- Paths outside `versions/`, paths with traversal, and unsupported extensions are skipped.
- The cleanup service re-reads current `menu_widgets.image_path` values for the menu site immediately before remove.
- Any currently referenced path is skipped, including references from hidden widgets.
- If the DB reference check fails, Storage removal is skipped entirely and the save remains successful.

Storage policy:

- Bucket is `menu-images`.
- Storage removal uses the server-only service-role client.
- Zero candidates do not call Storage.
- Cleanup failure does not roll back the already-successful DB save and does not delete the new image.
- Failed cleanup paths remain orphan candidates for the separate audit/cleanup flow.
- Logs may include operation, menu site ID, counts, and safe error codes/messages, but must not include customer content, image URLs, or service credentials.

Draft cleanup remains separate:

- `/api/menu-widget-images` may remove a previous unsaved draft version before final save.
- Post-save cleanup removes only old stored paths after DB/RPC success.
- Both paths protect DB-referenced images and use `imagePath`, never `imageUrl`.

## 18. Rendering Policy

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
- Apply the template content separator policy in the same logical source order.
- Vertical page scroll is allowed.
- Horizontal overflow and nested scroll are not allowed.

## 19. Template Content Separator Policy

Separator behavior is a template visual configuration, not a capability, entitlement, or billing rule.

CafeA uses its category divider line as the shared visual separator. The divider is owned by category blocks, not
widget blocks, and is rendered at the next category's top boundary:

- On mobile, render a divider before a visible category when that category has any previous visible block on the same page.
- On desktop/tablet, suppress that divider when the category is the first rendered block in its visual column.
- On desktop/tablet, render the divider when the category starts after another visible category or widget in the same visual column.
- Do not render a divider before the first visible block when that block is a category.
- If a page starts with a widget and then a category, render the divider before that category.
- Render no category bottom divider or terminal divider.
- Do not render a divider above widgets.
- Do not render a divider below widgets.
- Do not render a divider between consecutive widgets.
- Do not render a divider on ordered-fit category continuation fragments.
- Keep desktop/tablet divider spacing balanced around the line: the preceding block owns the divider-before gap,
  and the category top divider owns the divider-after gap.
- Keep widgets visually separated with their own border and the template transition gaps.
- Exclude hidden category and widget blocks from separator decisions.
- Keep the logical order policy shared, then apply only the desktop/tablet visual-column-start suppression after layout decides where blocks sit.

CafeA uses `categoryDivider: "before-category-except-first-block"` and `widgetBoundary: "none"`. Templates without
category divider lines should use `categoryDivider: "none"` and `widgetBoundary: "none"`. Other templates remain on
the fallback `none` policy until their visual language explicitly opts in.

## 20. Future Migration Needs

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

## 19. Future Editor And Save Work

Later stages must add:

- Owner/public loader query for `menu_widgets`
- Editor draft state and image upload flow
- Server save validation using the helpers in `lib/menu-widgets.ts`
- Combined category/widget reorder save
- Copy/reset/delete behavior for widget rows and images
- Public CafeA renderer connection

Storage cleanup after image replacement or widget deletion is connected at the final-save action boundary, but real
widget UI saves have not exercised it yet.
