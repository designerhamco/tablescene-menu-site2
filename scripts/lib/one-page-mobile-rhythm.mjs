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
  const header = [...root.querySelectorAll('header')].find(visible);
  const language = header?.querySelector('[data-cafe-a-mobile-language-row]');
  const brand = header?.querySelector('[data-cafe-a-store-title], [data-cafe-a-store-logo]');
  const brandDescription = header?.querySelector('[data-cafe-a-store-description]');
  const gap = (first, next) => first && next ? next.getBoundingClientRect().top - first.getBoundingClientRect().bottom : null;
  const rootTop = root.getBoundingClientRect().top;
  const kohiLineGaps = [...root.querySelectorAll('[data-kohi-divider]')].filter((line) => line.getAttribute('data-kohi-divider') !== 'column').map((line) => {
    const end = rootTop + Number(line.getAttribute('y1')) + 0.5;
    const kind = line.getAttribute('data-kohi-divider');
    const selector = kind === 'heading' ? '[data-cafe-a-item-stack]' : '[data-cafe-a-category-heading]';
    const next = [...(flow?.querySelectorAll(selector) ?? [])].filter(visible).find((element) => element.getBoundingClientRect().top >= end);
    return { kind, after: next ? next.getBoundingClientRect().top - end : null };
  });
  return {
    key: root.getAttribute('data-template-key'),
    viewport: [innerWidth, innerHeight],
    mobileStyle: root.getAttribute('data-cafe-a-mobile-style'),
    contract: root.getAttribute('data-spacing-contract'),
    copyAware: root.getAttribute('data-cafe-a-copy-aware-rhythm'),
    itemGap, sectionGap,
    autoBrand: Boolean(root.querySelector('[data-mobile-brand-fit]')),
    languageHeight: visible(language) ? language.getBoundingClientRect().height : null,
    languageToBrand: visible(language) ? gap(language, brand) : null,
    brandToDescription: gap(brand, brandDescription),
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
  if (!Number.isFinite(measurement.sectionGap) || measurement.sectionGap <= 0) failures.push('invalid section-gap token');
  if (measurement.categories.length === 0) failures.push('no rendered categories');
  for (const category of measurement.categories) {
    if (category.itemGaps.some((gap) => Math.abs(gap - measurement.itemGap) > 0.2)) failures.push(`${category.title}: item gap is not the mobile reading gap`);
    if (Math.abs(category.lastMargin) > 0.2) failures.push(`${category.title}: duplicated last-item margin`);
    if (category.headingGap != null && Math.abs(category.headingGap - (measurement.key === 'cafe_kohi_a' ? 2.0625 : 1.5) * measurement.itemGap / 1.25) > 0.25) failures.push(`${category.title}: heading gap is not the mobile rule`);
  }
  if (measurement.upperGap == null || Math.abs(measurement.upperGap - measurement.sectionGap) > 0.25) failures.push('upper-to-menu boundary is not linked to category spacing');
  if (measurement.blockGaps.some((gap) => Math.abs(gap - measurement.sectionGap) > 0.25)) failures.push('category/widget/footer boundary is not linked to section spacing');
  if (measurement.overflow > 1) failures.push('horizontal overflow');
  const rem = measurement.itemGap / 1.25;
  const expectedFonts = { name: rem, price: rem, description: rem * 0.875, secondary: rem * 0.75, category: rem * (measurement.key === 'fast_food_loop_bagel_a' ? 1.62 : 1.5) };
  for (const [role, expected] of Object.entries(expectedFonts)) if (measurement.fonts?.[role] != null && Math.abs(measurement.fonts[role] - expected) > 0.05) failures.push(`${role}: mobile typography base changed`);
  if (measurement.languageHeight != null && Math.abs(measurement.languageHeight - measurement.itemGap / 1.25 * 3) > 0.25) failures.push('top control row is not 48px');
  if (measurement.languageToBrand != null && Math.abs(measurement.languageToBrand - measurement.itemGap / 1.25 * 1.5) > 0.25) failures.push('top row to brand gap is not 24px');
  if (measurement.brandToDescription != null && Math.abs(measurement.brandToDescription - measurement.itemGap / 1.25 * 0.75) > 0.25) failures.push('brand to description gap is not 12px');
  for (const line of measurement.kohiLineGaps ?? []) if (line.after == null || Math.abs(line.after - measurement.itemGap / 1.25 * (line.kind === 'heading' ? 1.5 : 0.75)) > 0.25) failures.push(`KOHI ${line.kind}: gap is not measured from stroke end`);
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
