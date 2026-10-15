/** Read-only DOM measurements, shared by manual CUA and preview QA. */
export function measureOnePageMobileRhythm() {
  const visible = (element) => Boolean(element && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0);
  const root = document.querySelector('.cafe-a-typography');
  if (!root) return { missingRoot: true };
  const style = getComputedStyle(root);
  const pxPerRem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  const itemGap = pxPerRem * 1.25;
  const sectionGap = Number.parseFloat(style.getPropertyValue('--cafe-a-mobile-section-gap')) * pxPerRem;
  const scroll = [...document.querySelectorAll('[data-cafe-a-scroll-content]')].find(visible);
  const flow = scroll?.querySelector('.cafe-a-fit-menu-grid');
  const categories = flow ? [...flow.querySelectorAll('[data-cafe-a-category-block]')].filter(visible) : [];
  const blocks = flow ? [...flow.children].filter(visible) : [];
  const cover = scroll ? [...scroll.children].find((element) => element.classList.contains('cafe-a-cover-hero') && visible(element)) : null;
  const upper = [...root.querySelectorAll('[data-cafe-a-mobile-upper-box]')].find(visible) || cover || [...document.querySelectorAll('[data-cafe-a-round-focus-mobile-brand-section], [data-cafe-a-topline-mobile-notices]')].filter(visible).at(-1) || [...root.querySelectorAll('header')].find(visible);
  const fieldSize = (selector) => {
    const element = [...root.querySelectorAll(selector)].find(visible);
    return element ? Number.parseFloat(getComputedStyle(element).fontSize) : null;
  };
  const fieldMultiplier = (selector, variant) => {
    const element = [...root.querySelectorAll(selector)].find(visible);
    return element?.closest(`[data-cafe-a-content-variant="${variant}"]`) ? 1.05 : 1;
  };
  const header = [...root.querySelectorAll('header')].find(visible);
  const language = header?.querySelector('[data-cafe-a-mobile-language-row]');
  const callBar = header?.querySelector('[data-one-page-call-bar]');
  const brand = header?.querySelector('[data-cafe-a-store-title], [data-cafe-a-store-logo]');
  const brandLine = brand?.querySelector('[data-mobile-brand-line]');
  const brandDescription = header?.querySelector('[data-cafe-a-store-description]');
  const gap = (first, next) => first && next ? next.getBoundingClientRect().top - first.getBoundingClientRect().bottom : null;
  const upperContent = [header, ...root.querySelectorAll('.cafe-a-topline-mobile-notices .cafe-a-mobile-notice-list, .cafe-a-round-focus-mobile-notices .cafe-a-round-focus-notice-list, .cafe-a-round-focus-mobile-notices .cafe-a-mobile-notice-list, .cafe-a-cover-hero')].filter(visible).sort((first, next) => first.getBoundingClientRect().top - next.getBoundingClientRect().top);
  const rootTop = root.getBoundingClientRect().top;
  const kohiLineGaps = [...root.querySelectorAll('[data-kohi-divider]')].filter((line) => line.getAttribute('data-kohi-divider') !== 'column').map((line) => {
    const center = rootTop + Number(line.getAttribute('y1'));
    const halfStroke = (Number.parseFloat(getComputedStyle(line).strokeWidth) || 1) / 2;
    const start = center - halfStroke;
    const end = center + halfStroke;
    const kind = line.getAttribute('data-kohi-divider');
    const selector = kind === 'heading' ? '[data-cafe-a-item-stack]' : '[data-cafe-a-category-heading]';
    const next = [...(flow?.querySelectorAll(selector) ?? [])].filter(visible).find((element) => element.getBoundingClientRect().top >= end);
    const previousSelector = kind === 'heading' ? '[data-cafe-a-category-heading]' : '[data-cafe-a-item-stack]';
    const previous = [...(flow?.querySelectorAll(previousSelector) ?? [])].filter(visible).filter((element) => element.getBoundingClientRect().bottom <= start).at(-1);
    return { kind, before: previous ? start - previous.getBoundingClientRect().bottom : null, after: next ? next.getBoundingClientRect().top - end : null };
  });
  return {
    key: root.getAttribute('data-template-key'),
    viewport: [innerWidth, innerHeight],
    mobileStyle: root.getAttribute('data-cafe-a-mobile-style'),
    contract: root.getAttribute('data-spacing-contract'),
    copyAware: root.getAttribute('data-cafe-a-copy-aware-rhythm'),
    itemGap, sectionGap,
    autoBrand: Boolean(root.querySelector('[data-mobile-brand-fit]')),
    brandState: root.querySelector('[data-mobile-brand-fit]')?.getAttribute('data-mobile-brand-fit'),
    noticeSizes: [...root.querySelectorAll('.cafe-a-mobile-notice-list > p, .cafe-a-round-focus-notice-list > p')].filter(visible).map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    noticeLineHeights: [...root.querySelectorAll('.cafe-a-mobile-notice-list > p, .cafe-a-round-focus-notice-list > p')].filter(visible).map((element) => Number.parseFloat(getComputedStyle(element).lineHeight)),
    categoryDescriptions: [...root.querySelectorAll('[data-cafe-a-category-description]')].filter(visible).map((element) => ({ size: Number.parseFloat(getComputedStyle(element).fontSize), weight: getComputedStyle(element).fontWeight })),
    noticeGaps: [...root.querySelectorAll('.cafe-a-mobile-notice-list, .cafe-a-round-focus-notice-list')].filter(visible).flatMap((list) => {
      const rows = [...list.children].filter(visible);
      return rows.slice(0, -1).map((row, index) => gap(row, rows[index + 1]));
    }),
    languageHeight: visible(language) ? language.getBoundingClientRect().height : null,
    callEnabled: root.getAttribute('data-one-page-call-enabled') === 'true',
    callBarHeight: visible(callBar) ? callBar.getBoundingClientRect().height : null,
    languageToBrand: visible(language) ? gap(language, brand) : null,
    brandToDescription: gap(brand, brandDescription),
    upperContentGaps: upperContent.slice(0, -1).map((block, index) => gap(block, upperContent[index + 1])),
    brandInnerWidth: brand?.parentElement?.getBoundingClientRect().width ?? null,
    brandLineCount: brand?.querySelectorAll('[data-mobile-brand-line]').length ?? 0,
    brandText: brand?.getAttribute('aria-label') ?? null,
    brandLineWidth: brandLine ? (() => {
      const range = document.createRange();
      range.selectNodeContents(brandLine);
      return range.getBoundingClientRect().width;
    })() : null,
    categoryCopyGaps: [...root.querySelectorAll('[data-cafe-a-category-description]')].filter(visible).map((element) => {
      const css = getComputedStyle(element);
      return Number.parseFloat(element.classList.contains('cafe-a-category-eyebrow') ? css.marginBottom : css.marginTop);
    }),
    supportingLineHeights: [...root.querySelectorAll('[data-cafe-a-menu-description], [data-cafe-a-store-description], [data-cafe-a-category-description]')].filter(visible).map((element) => Number.parseFloat(getComputedStyle(element).lineHeight)),
    copyGaps: [...root.querySelectorAll('.cafe-a-menu-copy > .cafe-a-menu-title-row, .cafe-a-menu-copy > .cafe-a-menu-meta')].filter(visible).filter((element) => Boolean(element.nextElementSibling)).map((element) => Number.parseFloat(getComputedStyle(element).marginBottom)),
    kohiLineGaps,
    upperGap: upper && blocks[0] ? blocks[0].getBoundingClientRect().top - upper.getBoundingClientRect().bottom : null,
    blockGaps: blocks.slice(0, -1).map((block, index) => blocks[index + 1].getBoundingClientRect().top - block.getBoundingClientRect().bottom),
    categories: categories.map((category) => {
      const stacks = [...category.querySelectorAll('[data-cafe-a-item-stack]')].filter(visible);
      return {
        title: category.querySelector('.cafe-a-category-title')?.textContent,
        itemCount: stacks.length,
        itemGaps: stacks.slice(0, -1).map((stack, index) => stacks[index + 1].getBoundingClientRect().top - stack.getBoundingClientRect().bottom),
        lastMargin: stacks.length ? Number.parseFloat(getComputedStyle(stacks.at(-1)).marginBottom) : 0,
        headingGap: gap(category.querySelector('[data-cafe-a-category-heading]'), stacks[0]),
      };
    }),
    fontMultipliers: { secondary: fieldMultiplier('.cafe-a-menu-meta', 'secondary-only'), description: fieldMultiplier('[data-cafe-a-menu-description]', 'description-only') },
    supportingCopyRuns: [...root.querySelectorAll('.cafe-a-description-text, .cafe-a-time-sale-time-text')].filter(visible).map(element => ({ size: parseFloat(getComputedStyle(element).fontSize), lineHeight: parseFloat(getComputedStyle(element).lineHeight) })),
    fonts: {
      brand: fieldSize('[data-cafe-a-store-title]'), category: fieldSize('.cafe-a-category-title'),
      name: fieldSize('[data-cafe-a-menu-name]'), secondary: fieldSize('.cafe-a-menu-meta'),
      description: fieldSize('[data-cafe-a-menu-description]'), price: fieldSize('.cafe-a-menu-price'),
    },
    overflow: document.documentElement.scrollWidth - innerWidth,
  };
}

export function getOnePageMobileRhythmFailures(measurement) {
  if (measurement.missingRoot) return ['missing single-page root'];
  const failures = [];
  if (measurement.mobileStyle !== 'true') failures.push('mobile reading style is not active');
  if (measurement.contract !== 'mobile-reading') failures.push('mobile spacing contract is not separate from canvas-fit');
  if (measurement.copyAware === 'true') failures.push('PC/tablet copy-aware rhythm leaked into mobile');
  if (measurement.autoBrand && measurement.brandState !== 'ready') failures.push('mobile brand-width measurement is not ready');
  if ((measurement.noticeGaps ?? []).some((gap) => Math.abs(gap) > 0.2)) failures.push('notice rows have extra paragraph spacing');
  if (!Number.isFinite(measurement.sectionGap) || measurement.sectionGap <= 0) failures.push('invalid section-gap token');
  if (measurement.categories.length === 0) failures.push('no rendered categories');
  for (const category of measurement.categories) {
    if (category.itemGaps.some((gap) => Math.abs(gap - measurement.itemGap) > 0.2)) failures.push(`${category.title}: item gap is not the mobile reading gap`);
    if (Math.abs(category.lastMargin) > 0.2) failures.push(`${category.title}: duplicated last-item margin`);
    const headingGap = measurement.itemGap / 1.25 * 1.5;
    if (category.headingGap != null && Math.abs(category.headingGap - headingGap) > 0.25) failures.push(`${category.title}: heading gap is not the mobile rule`);
  }
  const rem = measurement.itemGap / 1.25;
  const upperBoundary = measurement.sectionGap;
  if (measurement.upperGap == null || Math.abs(measurement.upperGap - upperBoundary) > 0.25) failures.push('upper-to-menu boundary is not linked to category spacing');
  if (measurement.blockGaps.some((gap) => Math.abs(gap - measurement.sectionGap) > 0.25)) failures.push('category/widget/footer boundary is not linked to section spacing');
  if (measurement.overflow > 1) failures.push('horizontal overflow');
  const expectedFonts = { name: rem, price: rem, description: rem * 0.875 * (measurement.fontMultipliers?.description ?? 1), secondary: rem * 0.75 * (measurement.fontMultipliers?.secondary ?? 1), category: rem * 1.625 };
  if (measurement.fonts?.brand != null && measurement.fonts.brand < Math.max(44, rem * 2.75) - 0.05) failures.push('mobile brand is below its 44px minimum');
  if (measurement.brandInnerWidth && measurement.brandLineCount) {
    const compactLength = Array.from((measurement.brandText ?? '').replace(/\s+/gu, '')).length;
    const regularSingleCeiling = Math.max(44, rem * 2.75, measurement.brandInnerWidth * 56 / 342);
    const regularCoverage = measurement.brandLineCount === 1 && measurement.brandLineWidth && measurement.fonts.brand
      ? measurement.brandLineWidth * regularSingleCeiling / measurement.fonts.brand / measurement.brandInnerWidth
      : Infinity;
    const shortNameBoost = compactLength >= 3 && compactLength <= 4 && regularCoverage < 0.45;
    const oneLineRatio = shortNameBoost ? 64 : 56;
    const ceiling = Math.max(44, rem * 2.75, measurement.brandInnerWidth * (measurement.brandLineCount === 1 ? oneLineRatio : 44) / 342);
    if (measurement.fonts.brand > ceiling + 0.1) failures.push('mobile brand exceeds its visual ceiling');
  }
  if ((measurement.categoryCopyGaps ?? []).some((gap) => Math.abs(gap - rem * 0.5) > 0.05)) failures.push('category copy gap is not 8px');
  if (measurement.supportingCopyRuns) {
    if (measurement.supportingCopyRuns.some(({ size, lineHeight }) => Math.abs(lineHeight - size * 1.5) > 0.05)) failures.push('supporting line-height is not shared 1.5');
  } else if ((measurement.supportingLineHeights ?? []).some((height) => Math.abs(height - rem * 0.875 * 1.5) > 0.05)) failures.push('supporting line-height is not shared 1.5');
  if ((measurement.copyGaps ?? []).some((gap) => Math.abs(gap - rem * 0.125) > 0.05)) failures.push('item internal copy gap is not 2px');
  if ((measurement.noticeSizes ?? []).some((size) => Math.abs(size - rem * 0.875) > 0.05)) failures.push('notices are not uniformly 14px');
  if ((measurement.noticeLineHeights ?? []).some((height) => Math.abs(height - rem * 0.875 * 1.5) > 0.05)) failures.push('notices do not use normal body line-height');
  if ((measurement.categoryDescriptions ?? []).some((description) => Math.abs(description.size - rem * 0.875) > 0.05)) failures.push('category descriptions are not 14px');
  for (const [role, expected] of Object.entries(expectedFonts)) if (measurement.fonts?.[role] != null && Math.abs(measurement.fonts[role] - expected) > 0.05) failures.push(`${role}: mobile typography base changed`);
  const expectedTopControlHeight = measurement.callEnabled ? rem * 3.5 : rem * 3;
  const expectedTopControlGap = measurement.callEnabled ? rem : rem * .75;
  if (measurement.languageHeight != null && Math.abs(measurement.languageHeight - expectedTopControlHeight) > 0.25) failures.push(`top control row is not ${measurement.callEnabled ? 56 : 48}px`);
  if (measurement.callEnabled && (measurement.callBarHeight == null || Math.abs(measurement.callBarHeight - rem * 3.5) > 0.25)) failures.push('enabled Call bar is not 56px');
  if (measurement.languageToBrand != null && Math.abs(measurement.languageToBrand - expectedTopControlGap) > 0.25) failures.push(`top row to brand gap is not ${measurement.callEnabled ? 16 : 12}px`);
  if (measurement.brandToDescription != null && Math.abs(measurement.brandToDescription - measurement.itemGap / 1.25 * 0.75) > 0.25) failures.push('brand to description gap is not 12px');
  if ((measurement.upperContentGaps ?? []).some((gap) => Math.abs(gap - rem * 1.5) > 0.25)) failures.push('upper content block gap is not 24px');
  if (measurement.key === 'cafe_kohi_a' && (measurement.kohiLineGaps ?? []).length > 0) failures.push('KOHI mobile decorative rules must stay disabled');
  return failures;
}

export function compareMobileRhythmViewports(first, next) {
  const failures = [];
  for (const [role, size] of Object.entries(first.fonts)) {
    if (role === 'brand' && first.autoBrand && next.autoBrand) continue;
    if (size != null && next.fonts[role] != null && Math.abs(size - next.fonts[role]) > 0.05) failures.push(`${role} font changes with viewport`);
  }
  for (const key of ['itemGap', 'sectionGap']) if (Math.abs(first[key] - next[key]) > 0.05) failures.push(`${key} changes with viewport`);
  return failures;
}
