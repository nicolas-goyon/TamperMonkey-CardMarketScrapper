/**
 * Everything a loader userscript can configure. Every field is optional: the
 * loader only lists what it wants to change, `resolveConfig` fills the rest
 * from DEFAULTS (so adding an option never breaks an existing loader).
 */
import type { DelayRange } from './core/util';

export type Corner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type SpeedPreset = 'safe' | 'balanced' | 'fast';

export interface ScraperDelays {
  /** After a page load, before scraping starts. */
  initialPageLoad: DelayRange;
  /** Between two "Load More" clicks. */
  betweenLoadMore: DelayRange;
  /** After all offers of a page are loaded. */
  afterLoadingComplete: DelayRange;
  /** Before navigating to the next card / expansion batch. */
  cardNavigation: DelayRange;
  /** Before the first "Load More" click on a page. */
  firstScrape: DelayRange;
}

export interface CartFillerDelays {
  /** After a page load, before scanning/acting. */
  initialPageLoad: DelayRange;
  /** Between two "Put in shopping cart" clicks on the same page. */
  betweenCartAdds: DelayRange;
  /** Before navigating to the next card / next page. */
  betweenNavigation: DelayRange;
}

export interface CardmarketHelperConfig {
  /** Turn individual tools on/off. Default: all on. */
  features?: {
    wishlistExporter?: boolean;
    offersScraper?: boolean;
    cartExporter?: boolean;
    cartFiller?: boolean;
  };
  scraper?: {
    /** CardMarket seller-country filter id (12 = France). null = no filter. */
    sellerCountry?: number | null;
    /** Expansion ids fetched per page on /Cards/ pages. Default 5. */
    expansionBatchSize?: number;
    /** Delay preset: 'safe' (slowest), 'balanced' (default), 'fast' (riskier). */
    speed?: SpeedPreset;
    /** Fine-grained overrides on top of the preset (ms). */
    delays?: Partial<ScraperDelays>;
    /** Download partial results every N scraped cards (0 = never). Default 5. */
    autoDownloadEvery?: number;
  };
  cartFiller?: {
    speed?: SpeedPreset;
    delays?: Partial<CartFillerDelays>;
    /** How long to wait for the navbar cart total to change after a click (ms). */
    cartUpdateTimeout?: number;
  };
  ui?: {
    /** Corner of the floating launcher and progress panel. */
    position?: Corner;
    /** 'auto' follows CardMarket's own light/dark theme. */
    theme?: 'auto' | 'light' | 'dark';
    /** Extra distance from the corner, px (e.g. to dodge a chat widget). */
    offset?: { x?: number; y?: number };
  };
  /** Verbose console logging. */
  debug?: boolean;
}

export interface ResolvedConfig {
  features: Required<NonNullable<CardmarketHelperConfig['features']>>;
  scraper: {
    sellerCountry: number | null;
    expansionBatchSize: number;
    delays: ScraperDelays;
    autoDownloadEvery: number;
  };
  cartFiller: {
    delays: CartFillerDelays;
    cartUpdateTimeout: number;
    cartUpdatePoll: number;
  };
  ui: { position: Corner; theme: 'auto' | 'light' | 'dark'; offset: { x: number; y: number } };
  debug: boolean;
}

const SCRAPER_PRESETS: Record<SpeedPreset, ScraperDelays> = {
  safe: {
    initialPageLoad: { min: 3000, max: 5000 },
    betweenLoadMore: { min: 1500, max: 2500 },
    afterLoadingComplete: { min: 700, max: 1000 },
    cardNavigation: { min: 2000, max: 3000 },
    firstScrape: { min: 200, max: 400 },
  },
  balanced: {
    initialPageLoad: { min: 2000, max: 3000 },
    betweenLoadMore: { min: 800, max: 1300 },
    afterLoadingComplete: { min: 400, max: 700 },
    cardNavigation: { min: 1000, max: 1500 },
    firstScrape: { min: 100, max: 200 },
  },
  fast: {
    initialPageLoad: { min: 1000, max: 1500 },
    betweenLoadMore: { min: 500, max: 800 },
    afterLoadingComplete: { min: 200, max: 400 },
    cardNavigation: { min: 500, max: 1000 },
    firstScrape: { min: 50, max: 100 },
  },
};

const CART_FILLER_PRESETS: Record<SpeedPreset, CartFillerDelays> = {
  safe: {
    initialPageLoad: { min: 2500, max: 4000 },
    betweenCartAdds: { min: 1200, max: 2000 },
    betweenNavigation: { min: 2000, max: 3500 },
  },
  balanced: {
    initialPageLoad: { min: 1500, max: 2500 },
    betweenCartAdds: { min: 600, max: 1200 },
    betweenNavigation: { min: 1200, max: 2000 },
  },
  fast: {
    initialPageLoad: { min: 800, max: 1300 },
    betweenCartAdds: { min: 300, max: 600 },
    betweenNavigation: { min: 600, max: 1000 },
  },
};

function preset<T>(table: Record<SpeedPreset, T>, speed: SpeedPreset | undefined): T {
  return table[speed && speed in table ? speed : 'balanced'];
}

export function resolveConfig(input: CardmarketHelperConfig = {}): ResolvedConfig {
  const f = input.features ?? {};
  const s = input.scraper ?? {};
  const c = input.cartFiller ?? {};
  const u = input.ui ?? {};
  const corners: Corner[] = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
  return {
    features: {
      wishlistExporter: f.wishlistExporter ?? true,
      offersScraper: f.offersScraper ?? true,
      cartExporter: f.cartExporter ?? true,
      cartFiller: f.cartFiller ?? true,
    },
    scraper: {
      sellerCountry: s.sellerCountry === undefined ? 12 : s.sellerCountry,
      expansionBatchSize: Math.max(1, Math.floor(s.expansionBatchSize ?? 5)),
      delays: { ...preset(SCRAPER_PRESETS, s.speed), ...(s.delays ?? {}) },
      autoDownloadEvery: Math.max(0, Math.floor(s.autoDownloadEvery ?? 5)),
    },
    cartFiller: {
      delays: { ...preset(CART_FILLER_PRESETS, c.speed), ...(c.delays ?? {}) },
      cartUpdateTimeout: c.cartUpdateTimeout ?? 10000,
      cartUpdatePoll: 500,
    },
    ui: {
      position: u.position && corners.includes(u.position) ? u.position : 'bottom-right',
      theme: u.theme ?? 'auto',
      offset: { x: u.offset?.x ?? 0, y: u.offset?.y ?? 0 },
    },
    debug: !!input.debug,
  };
}
