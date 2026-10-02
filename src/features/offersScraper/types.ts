import type { WishlistCard, WishlistPrinting } from '../wishlistExporter';

/** A card of the merged scrape list (wishlist card + merge metadata). */
export interface ScrapeCard extends WishlistCard {
  wishlist_amounts: Record<string, number>;
  /** Present on raw merge variations only; stripped before export. */
  wishlist_id?: string;
  wishlist_account?: string;
  wishlist_name?: string;
  /** Pre-v1.4 exports had a single language string. */
  language?: string;
}

export interface LoadedWishlist {
  id: string;
  name?: string;
  account?: string;
  cards: ScrapeCard[];
}

export interface WishlistMeta {
  id: string;
  account: string;
  name: string;
}

/** One offer row — the offers JSON contract parsed by model.CardOffer.from_dict. */
export interface Offer {
  seller: string;
  seller_link: string | null;
  price: string;
  condition: string | null;
  language: string | null;
  location: string | null;
  printing: WishlistPrinting | null;
  quantity: number;
  name: string;
  tracking_required: boolean;
}

export interface CardOffers {
  wished_card: Omit<ScrapeCard, 'wishlist_id' | 'wishlist_account' | 'wishlist_name'>;
  offers: Offer[];
  price_trend: number | null;
}

export interface ScrapeResult {
  wishlist_id: string;
  card_offers: CardOffers[];
  wishlists_metadata: WishlistMeta[];
}

/** Persisted (GM storage) across page loads for the whole run. */
export interface ScrapeState {
  wishlists: Array<{ id: string; cards: ScrapeCard[] }>;
  currentWishlistIndex: number;
  currentCardIndex: number;
  results: Array<ScrapeResult | null>;
  startTime: number;
  isMerged?: boolean;
  sourceWishlistIds?: string[];
  wishlistsMetadata?: WishlistMeta[];
  stopRequested?: boolean;
}

/** Persisted progress through the expansion batches of one /Cards/ page. */
export interface BatchState {
  wishlistIndex: number;
  cardIndex: number;
  baseUrl: string;
  params: string[];
  batches: string[][];
  currentBatchIndex: number;
  totalBatches: number;
  allOffers: Offer[];
  priceTrend: number | null;
}

export const STATE_KEY = 'cardmarket_offers_state';
export const BATCH_STATE_KEY = 'cardmarket_offers_batch_state';
/**
 * Query param stamped onto every URL the scraper navigates to, value
 * "<wishlistIndex>-<cardIndex>": only the tab our own navigation landed on
 * may resume the run — a second CardMarket tab must not parse its unrelated
 * page as the "current card" and corrupt the shared state.
 */
export const PAGE_MARKER_PARAM = 'cmscrape';
