# Corner auxiliary surfaces and header alignment — 2026-10-24

PC/tablet upper-left auxiliary backgrounds now reach the top/left page edges in both the Basic neutral corner and ONUE's native panel flow. Outer insets belong to the scroll surface, with matching content-box measurements; the colored first block extends through its top/left inset while retaining internal padding and the normal gutter after the painted block. Footer positioning and real negative-margin flow are included in the same geometry. Absent/equal-to-page auxiliary colors restore the previous unpanelled geometry. Mobile remains on its separate renderer.

Top-row catalog alignment is disabled on PC/tablet for Basic list/album, Sunday and Van Gogh. Header cells retain description-left, brand/logo-center and notice-right alignment even if a legacy saved/preview value requests right alignment. Mobile catalog alignment stays enabled and follows the saved value. The menu editor shows the fixed header control and submits an unchanged hidden mobile value, so disabling the select does not erase it.

## Verification

- 833 unit tests pass, including saved-design/native-shell header detection and disabled editor submission preserving the existing mobile alignment. Production build and changed-file ESLint pass.
- 24 actual DOM geometry cases: Basic corner and ONUE, grouped/fill, cover/actions enabled or disabled, at PC 1280×720, landscape tablet 1180×820 and portrait tablet 820×1180. Every colored panel starts at x=0/y=0, reports ready, and has no horizontal overflow.
- Basic at 1280×720: painted corner x=0/y=0/width=416, internal padding 32; next column starts at x=448 and the following first-column category starts 32px after the painted bottom. ONUE: painted corner x=0/y=0/width=636, internal padding 36; next column starts at x=644 and the following category keeps its native section gap.
- Four absent/equal-color cases restore original Basic x=32/y=32 and ONUE x=8/y=8 geometry.
- Six actual scroll-to-end cases with Call+Order enabled: all final product bounds are inside the scroll viewport, dock/viewport overlap is zero, and the dock retains its normal bottom inset across all three viewports.
- 12 actual catalog UI/header cases: Basic top-row list/album, Sunday and Van Gogh at PC/tablet/mobile. PC/tablet controls disabled and actual name/description alignment center/left; mobile controls enabled and actual right/right alignment retained from the test setting.
- All seven mobile designs at actual 320×844 Korean and 430×844 English retain 26px categories, the existing text-brand fit with a 44px minimum, and no horizontal overflow. No font, reading-size, item-gap, color or customer-content data changes.

Sample DOM records for this run: `/private/tmp/corner-panel-matrix.json`, `/private/tmp/top-row-alignment-matrix.json`, `/private/tmp/corner-scroll-end.json`, and `/private/tmp/corner-restore-mobile.json`.
