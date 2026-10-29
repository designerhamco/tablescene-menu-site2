# Preview purpose separation — 2026-10-24

Catalog previews retain feature/design experiments and show one shared explanation above the tabs: “보기·디자인 옵션을 바꿔 템플릿을 체험해 보세요. 변경 내용은 미리보기에만 적용되며 저장되지 않습니다.” The former Design-only duplicate is removed. These changes do not persist customer data.

Saved-menu previews are confirmation-only. They expose the shared device selector, supported tablet orientation and detached view. The 2026-10-29 request removes the editor-return link and confines fullscreen to detached actual views for both preview purposes. They do not expose feature/design panels, Call/Order toggles or packing switches. Catalog design, chip, visibility, layout and service query experiments are ignored by the saved renderer and stripped from generated device/iframe/detached URLs, including old bookmarked URLs. Language and page selection remain available. Saved template/design/content/colors/visibility/packing remain authoritative. Call and Order simulations follow registered settings and template capabilities, with the existing previewOnly request suppression. Authentication, menu authorization and lifecycle checks remain in place.

Validation: full regression suite and production build; browser checks for catalog desktop/mobile tab behavior, readable shared copy, customer tools and saved content preservation, clean device/detached URLs, and Production provider status plus smoke. No menu data migration or writes.

Pre-release result: 831/831 regression tests passed; changed-file ESLint clean; Next.js production build passed. Browser DOM at 1280×720 and 390×844 confirms one shared explanation, both tabs retain it, the prior duplicate is absent, the mobile panel opens/closes and there is no outer horizontal overflow. Production saved-menu baseline recorded with 18 product names and two chip colors for post-release comparison.

2026-10-29: common toolbar controls now match across catalog/saved previews. Catalog-only service and packing experiments are in the left panel. All framed devices fit and center in the available canvas while keeping intrinsic iframe viewport dimensions; see `responsive-preview-qa.md` for current verification.
