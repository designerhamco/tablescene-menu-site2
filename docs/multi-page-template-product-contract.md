# Multi-page Menu Book Product Contract

> Legacy compatibility note (2026-08-30): this document preserves the retired Brew Chapter behavior for existing data. New multi-page Dining development and sales use `docs/aube-table-multi-page-template-contract.md`; Brew Chapter is excluded from new creation, purchase, and template switching.

## Scope

The customer-facing Multi-page Basic template is a menu-book product, not a One-page template with page buttons. Brew Chapter separates the public experience into an optional cover unit and category-based menu page units.

Initial template:

- Template key: `cafe_brew_chapter_a`
- Component: `CafeBrewChapterA`
- Customer name: `브루 챕터`
- Starter name: `MAISON ECLAT`
- Catalog status: hidden until product QA is complete

## Pagination Units

For `cafe_brew_chapter_a`, global pagination count is:

```text
optional cover unit 1
+ one unit per visible category
```

Menu page row count and `menu_events` data do not increase the global dot count. Visible category count does.

Examples:

- Cover ON + visible categories 5 = 6 dots
- Cover OFF + visible categories 5 = 5 dots
- Cover ON + visible categories 2 + visible event count 2 = still 3 dots

## Cover Unit

- Maximum one cover unit.
- Cover unit is controlled by `page_settings.menu_cover_enabled`.
- Cover image visibility is controlled separately by `page_settings.cover_image_visible`.
- Uses customer data only.
- Displays `logo_url` when present, otherwise `restaurant_name`.
- Displays `brand_description`.
- Displays `footer_notice_1`, `footer_notice_2`, and `footer_notice_3` as independent rows when present.
- May display existing `cover_image_url`.
- If the cover page is disabled, stored cover text and image data are retained but no cover DOM or cover dot is rendered.
- If cover image visibility is disabled, stored image URL/path are retained but the cover media DOM is omitted and the cover text uses the full screen.
- Does not display menu categories, menu items, or events.
- Does not add fixed brand copy that the customer cannot edit.
- Must fit in one viewport without document scroll or internal cover scroll.
- Cover content height is calculated against the viewport after reserving the fixed global pagination height, bottom safe area, and an additional safety gap.
- Empty optional fields are omitted from the DOM and must not reserve visual space.
- Cover length and visual fit limits may become template-specific content limits later; the initial implementation does not introduce new content limits.

## Category Menu Units

- Each visible category is one global pagination unit.
- Hidden categories are excluded from pages and dots.
- Category `id` is the page identity; category name is display text only.
- Internal navigation uses visible menu categories.
- A category button shows exactly one selected category menu list and activates the matching page/dot.
- Multiple category blocks are not displayed simultaneously in the selected menu panel.
- Store name, brand description, and footer notices are not repeated inside the menu unit.
- Category buttons, pagination dots, swipe gestures, mouse click-drag, and keyboard navigation share one active page state.
- Changing category by any method resets the selected menu panel scroll position to the top.

Desktop and tablet:

- Two-column layout.
- Left column: category navigation.
- Right column: selected category menu list.
- Recommended starting ratio is about 20% / 80%.
- Left and right columns may scroll independently.
- Menu list is a single centered column.
- Left category navigation is rendered once and remains fixed while the right menu panel changes.
- Mouse click-drag on the right menu panel may move to the previous/next category page.

Mobile:

- No two-column layout.
- Category navigation is a sticky horizontal tab bar inside the menu unit.
- Selected category menu list is a single centered column.
- Vertical scroll is allowed.
- Horizontal drag on the tab rail scrolls the tab rail only.
- Horizontal swipe in the menu content changes category page.
- Vertical swipe in the menu content scrolls the menu content and must not be captured as page navigation.

## Event Support

- `cafe_brew_chapter_a` does not support event pages.
- `events` capability is disabled for Brew Chapter.
- Event editor UI must not be exposed for Brew Chapter.
- `menu_events` rows, if present from legacy or shared systems, are ignored by the Brew Chapter renderer.
- Event data must not create pagination dots, hidden pages, empty pages, or visual placeholders.
- This contract does not remove the global `menu_events` table or event support for other templates.

## Global Pagination

- Pagination is always visible at the bottom.
- Pagination is not hover-only.
- Pagination must not cover content.
- Safe-area bottom spacing must be reserved.
- No autoplay.
- Keyboard focus must be visible.
- Dot click changes active cover/category unit.
- Looping is disabled.
- ArrowLeft/ArrowRight may move between pages when focus is not inside an interactive control.

## Data Contract

- `menu_pages` remain menu grouping data.
- `menu_categories` are the current pagination and internal menu navigation unit.
- `menu_items` remain attached to categories.
- `menu_events` are not consumed by Brew Chapter.
- DB migration is not required for the initial implementation.
- Basic Display-specific page type fields must not be reused for this template.
- Customer-visible business content must come from starter/demo/customer data, not from the component.
- Component-level hardcoded content is limited to non-business UI affordances such as ARIA labels and generic controls.

## Exposure Contract

Until product QA is complete:

- Hidden from public template catalog
- Hidden from home and featured templates
- Hidden from `/apply`
- Not registered in Basic checkout allowlist
- Preview route may be accessed directly
- No DB migration is required

## Starter Contract

`cafe_brew_chapter_a` starter contains:

- Fine-dining cover data from `menu_sites`
- Optional cover page enabled by default
- Cover image visible by default
- Five category menu units with category tabs/nav
- Five categories and fifteen menu items connected to categories
- Existing time-sale/promotion data for the starter promotion example
- Featured item data may remain in starter data but is not forced into the visual shell unless the design calls for it later
- Preview, starter creation, sample reset, owner preview, and public rendering must share the same starter source.
- Starter inserts convert temporary keys to actual UUIDs for pages, categories, items, featured item, and promotion targets.

## QA Contract

Minimum product QA before exposure:

- Cover ON: global pagination count is cover + visible category count
- Cover OFF: global pagination count is visible category count
- Cover/category unit switching
- Category tab switching inside the menu unit
- Dot/category/swipe/drag active state synchronization
- Desktop/tablet two-column menu behavior
- Mobile sticky category tabs
- Mobile vertical scroll and horizontal swipe intent separation
- No horizontal overflow
- Cover page document scroll 0 and internal cover scroll 0
- Pagination/content overlap 0
- Event DOM 0 and event pagination dots 0 for Brew Chapter
- CafeA, Sunday Line, Round Focus, Mocha Forest, CafeNoir, Display smoke
- Static checks: `git diff --check`, TypeScript, lint, build, tests if present
