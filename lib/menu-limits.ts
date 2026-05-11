export const MENU_LIMITS = {
  maxPagesPerSite: 8,
  maxCategoriesPerPage: 8,
  maxItemsPerCategory: 20,
  maxItemsPerSite: 100,
  maxSocialLinksPerSite: 3,
  maxEventsPerSite: 5,
  maxChefsPerSite: 8,
  maxTraitsPerItem: 2,
  maxPriceOptionsPerItem: 5,
} as const;

export const MENU_FIELD_LIMITS = {
  menuSites: {
    name: 40,
    restaurantName: 40,
    restaurantCategory: 20,
    restaurantType: 40,
    menuCoverLabel: 40,
    slugMin: 3,
    slugMax: 40,
    introTitle: 40,
    introDescription: 120,
    brandDescription: 300,
    menuCoverTitle: 40,
    menuCoverDescription: 120,
    aboutDescription: 500,
    restaurantAddress: 100,
    openingHours: 100,
    mapUrl: 300,
  },
  menuPages: {
    title: 30,
    description: 100,
  },
  menuCategories: {
    name: 30,
    description: 100,
  },
  menuItems: {
    name: 40,
    priceLabel: 20,
    portionLabel: 20,
    description: 160,
    imageUrl: 500,
    originInfo: 300,
  },
  menuItemTraits: {
    label: 10,
    minValue: 1,
    maxValue: 5,
    defaultMaxValue: 5,
  },
  menuItemPriceOptions: {
    label: 20,
    priceLabel: 20,
  },
  menuChefs: {
    chefName: 30,
    chefRole: 40,
    chefDescription: 180,
    chefImageUrl: 500,
  },
  menuEvents: {
    eventTitle: 40,
    eventSubtitle: 60,
    eventDescription: 200,
    eventPeriod: 40,
    eventBenefit: 100,
    eventDetail: 200,
    eventRegularPriceLabel: 20,
    eventSalePriceLabel: 20,
    eventImageUrl: 500,
    linkUrl: 300,
  },
  menuSocialLinks: {
    label: 20,
    displayName: 40,
    url: 300,
  },
} as const;

export function isValidPublicSlug(slug: string) {
  return (
    slug.length >= MENU_FIELD_LIMITS.menuSites.slugMin &&
    slug.length <= MENU_FIELD_LIMITS.menuSites.slugMax &&
    /^[a-z0-9-]+$/.test(slug) &&
    !slug.startsWith("-") &&
    !slug.endsWith("-")
  );
}

export function isValidRestaurantPhone(value: string) {
  return /^[0-9+\-()\s]{8,20}$/.test(value);
}
