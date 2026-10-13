// Extracted without changing the existing rendering or fit formulas.
import { type CafeAWidgetPreview } from "@/components/menu-templates/CafeAWidgetBlock";
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import { type PriceDisplayMode } from "@/lib/menu-price-format";



// -----------------------------------------------------------------------------
// Basic engine candidate: data contracts, grouping, and fit/fill measurement types
// -----------------------------------------------------------------------------

export type MenuItem = PublicMenuTemplateProps["items"][number];

export type MenuCategory = PublicMenuTemplateProps["categories"][number];

type MenuPage = PublicMenuTemplateProps["pages"][number];

export type PriceOption = PublicMenuTemplateProps["priceOptions"][number];

export type PublicTimeSale = PublicMenuTemplateProps["timeSales"][number];

export type PublicTimeSaleItem = PublicTimeSale["items"][number];

export type PublicFeaturedSlide = NonNullable<PublicMenuTemplateProps["featuredSlides"]>[number];

export type PublicMenuWidget = NonNullable<PublicMenuTemplateProps["widgets"]>[number];

export type PublicItemPriceColumnValue = MenuItem["priceColumnValues"][number];

export type CafeDesignALocale = PublicMenuTemplateProps["locale"];

export type CafeDesignASkin = "default" | "mocha_forest" | "sunday_line" | "round_focus";

export type CafeDesignAProps = PublicMenuTemplateProps & {
  templateSkin?: CafeDesignASkin;
};

export type CafeDesignAFeaturedHeroSlide = {
  id: string;
  imageUrl: string | null;
  item: MenuItem | null;
};

export type CafeDesignAPriceDisplayMode = PriceDisplayMode | null;

export type CafeDesignAPriceToken = {
  label: string;
  price: string;
  priceColumnId?: string;
  originalPrice?: number | null;
  salePrice?: string;
};

export type CafeDesignAPriceRailColumn = {
  id: string;
  label: string;
  widthCandidates: string[];
};

export type CafeDesignATimeSaleMatch = {
  promotion: PublicTimeSale;
  item?: PublicTimeSaleItem;
  optionItemsByPriceColumnId: Map<string, PublicTimeSaleItem>;
};

export type CafeMenuImagePreview = {
  src: string;
  title: string;
  secondaryTitle?: string | null;
};

export type MenuGroup = {
  page: MenuPage;
  category: MenuCategory;
  items: MenuItem[];
};

export type CafeDesignAContentBlockType = "category" | "widget";

export type CafeDesignACategoryContentBlock = {
  blockType: "category";
  key: string;
  page: MenuPage;
  category: MenuCategory;
  items: MenuItem[];
  sortOrder: number;
  previousVisibleBlockType: CafeDesignAContentBlockType | null;
  nextVisibleBlockType: CafeDesignAContentBlockType | null;
  showDividerBeforeCategory: boolean;
};

export type CafeDesignAWidgetContentBlock = {
  blockType: "widget";
  key: string;
  page: MenuPage;
  widget: CafeAWidgetPreview;
  sortOrder: number;
  previousVisibleBlockType: CafeDesignAContentBlockType | null;
  nextVisibleBlockType: CafeDesignAContentBlockType | null;
};

export type CafeDesignAContentBlock = CafeDesignACategoryContentBlock | CafeDesignAWidgetContentBlock;

export type MenuPageGroup = {
  page: MenuPage;
  groups: MenuGroup[];
  blocks: CafeDesignAContentBlock[];
};

export type CafeDesignALayoutMode = "orderedFit" | "balanced" | "orderedBalancedFit";

export type CafeDesignAFitPresentationState = "loading" | "ready" | "reload";

export type CafeDesignABalancedVariant = "estimatedGreedy" | "sourceSequential" | "sourceRoundRobin" | "lastAwareGreedy" | "visibleExhaustive";

export type CafeDesignAFitState = {
  columns: number;
  fontScale: number;
  wrapScale: number;
  gapScale: number;
  balancedVariant: CafeDesignABalancedVariant;
  orderedBalancedBreaks: string;
  orderedBalancedFingerprint: string;
  status: "idle" | "fit" | "warning";
  measuredColumns: number;
  boardInnerHeight: number;
  flowHeight: number;
  primaryColumnBottom: number;
  primaryBottomGap: number;
  longestColumnBottom: number;
  primaryFillRatio: number;
  averageFillRatio: number;
  minFillRatio: number;
  lastColumnFillRatio: number;
  bottomGap: number;
  contentGap: number;
  itemBoxGap: number;
  textVisualGap: number;
  categoryBlockGap: number;
  visibleItemBottomGap: number;
  visibleTextBottomGap: number;
  visiblePriceBottomGap: number;
  visibleContentBottomGap: number;
  visibleAverageFillRatio: number;
  visibleMinFillRatio: number;
  visibleLastColumnFillRatio: number;
  boardInnerRight: number;
  rightmostMenuNameRight: number;
  rightmostSecondaryRight: number;
  rightmostPriceRight: number;
  rightmostChipRight: number;
  rightmostCategoryRight: number;
  rightSafetyGap: number;
  overflow: boolean;
};

export type CafeDesignAFinalFillBoost = {
  fontScale: number;
  gapScale: number;
};

export type BalancedColumn = {
  id: string;
  blocks: CafeDesignAContentBlock[];
  estimatedHeight: number;
};

export type CafeDesignAColumnMeasurement = {
  left: number;
  top: number;
  bottom: number;
  elements: DOMRect[];
};

export type CafeDesignAFitMeasurement = {
  boardInnerHeight: number;
  flowHeight: number;
  measuredColumns: number;
  primaryColumnBottom: number;
  primaryBottomGap: number;
  longestColumnBottom: number;
  primaryFillRatio: number;
  averageFillRatio: number;
  minFillRatio: number;
  lastColumnFillRatio: number;
  bottomGap: number;
  contentGap: number;
  itemBoxGap: number;
  textVisualGap: number;
  categoryBlockGap: number;
  visibleItemBottomGap: number;
  visibleTextBottomGap: number;
  visiblePriceBottomGap: number;
  visibleContentBottomGap: number;
  visibleAverageFillRatio: number;
  visibleMinFillRatio: number;
  visibleLastColumnFillRatio: number;
  boardInnerRight: number;
  rightmostMenuNameRight: number;
  rightmostSecondaryRight: number;
  rightmostPriceRight: number;
  rightmostChipRight: number;
  rightmostCategoryRight: number;
  rightSafetyGap: number;
  overflow: boolean;
};

export type CafeDesignABalancedWeightedBlock = {
  block: CafeDesignAContentBlock;
  index: number;
  estimatedHeight: number;
};

export type CafeDesignABalancedBlockMeasurement = {
  categoryRank?: number;
  affinity?: string;
  orderBoundary?: string;
  key: string;
  blockType?: "category" | "widget";
  widgetPlacement?: "flow" | "bottom";
  order: number;
  height: number;
  visibleItemHeight: number;
  visibleTextHeight: number;
  visiblePriceHeight: number;
  visibleContentHeight: number;
  marginBottom: number;
  estimatedHeight: number;
};

export type CafeDesignABalancedSimulatedColumn = {
  blocks: CafeDesignABalancedBlockMeasurement[];
  height: number;
};
