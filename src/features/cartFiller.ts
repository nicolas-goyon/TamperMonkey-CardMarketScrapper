/**
 * Cart filler: adds the optimizer-selected cards of one seller to the cart.
 *
 * The optimizer's HTML report (and the webapp) link to the seller's
 * Offers/Singles page with a hash  #cmcartfill=<base64url(JSON)>  where
 *   { v: 1, seller, items: [ {n, q, p, l, c, e, pv, f}, ... ] }
 *   n name, q quantity, p price string, l language, c condition,
 *   e expansion, pv printing version, f foil tri-state (null = either).
 * This payload is a contract with optimize_purchases.build_cart_fill_url and
 * webapp/static/app.js cartFillUrl — keep the keys in sync.
 *
 * Items are processed one by one: navigate to the seller's Singles page
 * filtered by name (+ language/foil, sorted by price), find the exact offer
 * row, set the amount and click CardMarket's own "Put in shopping cart"
 * button, following pagination when needed. Progress survives navigation via
 * sessionStorage; randomized delays keep the run well clear of rate limits.
 */
import type { ResolvedConfig } from '../config';
import { LANGUAGE_IDS, englishUrl, isEnglishVersion, route } from '../core/cardmarket';
import { tabStorage } from '../core/gm';
import { errorMessage, parsePrice, randomDelay, sleep } from '../core/util';
import { h } from '../ui/dom';
import { hideJob, showJob } from '../ui/jobPanel';
import { addMenuNote } from '../ui/launcher';
import { toast } from '../ui/toast';

const STATE_KEY = 'cmCartFillState';
const HASH_MARKER = 'cmcartfill=';
const PAGE_MARKER_PARAM = 'cmcf'; // stamped on URLs this feature navigates to

interface PayloadItem {
  n: string;
  q: number;
  p?: string | null;
  l?: string | null;
  c?: string | null;
  e?: string | null;
  pv?: string | null;
  f?: boolean | null;
}

interface ItemState extends PayloadItem {
  added: number;
  unverified?: number;
  status: 'pending' | 'done' | 'partial' | 'notfound';
}

interface FillState {
  active: boolean;
  seller: string;
  items: ItemState[];
  current: number;
}

interface OfferRow {
  articleId: string | null;
  name: string;
  expansion: string | null;
  condition: string | null;
  language: string | null;
  foil: boolean;
  price: number | null;
  version: string | null;
  available: number;
  cartButton: HTMLButtonElement | null;
  row: Element;
}

let cfg: ResolvedConfig['cartFiller'];

const loadState = () => tabStorage.get<FillState>(STATE_KEY);
const saveState = (s: FillState) => tabStorage.set(STATE_KEY, s);
const clearState = () => tabStorage.delete(STATE_KEY);
/** A Stop click clears the state; every pending sleep checks this afterwards. */
const stopped = () => loadState() === null;

// ---------------------------------------------------------------- payload

function readHashPayload(): { seller: string; items: PayloadItem[] } | null {
  const hash = window.location.hash || '';
  const idx = hash.indexOf(HASH_MARKER);
  if (idx === -1) return null;
  try {
    let b64 = hash.substring(idx + HASH_MARKER.length).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (!payload || payload.v !== 1 || !payload.seller || !Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('unexpected payload structure');
    }
    for (const item of payload.items) {
      if (!item.n || !(item.q >= 1)) throw new Error(`invalid item: ${JSON.stringify(item)}`);
    }
    return payload;
  } catch (e) {
    console.error('[CardMarket Helper] Failed to decode cart-fill payload:', e);
    toast('error', `Could not decode the card list from the URL (${errorMessage(e)}). Regenerate the report and use its "Add to Cart" button again.`, { title: 'Cart filler' });
    return null;
  }
}

function itemUrl(state: FillState, idx: number): string {
  const item = state.items[idx];
  const params = new URLSearchParams();
  params.set('name', item.n);
  params.set('sortBy', 'price_asc');
  const langId = item.l ? LANGUAGE_IDS[item.l] : null;
  if (langId) params.set('idLanguage', langId);
  if (item.f === true) params.set('isFoil', 'Y');
  else if (item.f === false) params.set('isFoil', 'N');
  params.set(PAGE_MARKER_PARAM, String(idx));
  return `https://www.cardmarket.com/en/Magic/Users/${encodeURIComponent(state.seller)}/Offers/Singles?${params.toString()}`;
}

// ---------------------------------------------------------------- parsing (same DOM contract as the offers scraper)

function versionFromThumbnail(row: Element): string | null {
  const title = row.querySelector('.thumbnail-icon')?.getAttribute('data-bs-title');
  const alt = title?.match(/alt=\\?"([^"]+)\\?"/);
  return alt?.[1].match(/\(V\.(\d+)\)/)?.[1] ?? null;
}

function parseRow(row: Element): OfferRow | null {
  const articleId = (row.id || '').match(/^stockRow(\d+)$/)?.[1] ?? null;
  // On a seller's Singles page this link is the card name (despite the
  // "col-seller" class); strip a "(V.n)" suffix but keep it as a fallback version.
  let name = row.querySelector('.col-seller a')?.textContent?.trim() || null;
  let nameVersion: string | null = null;
  if (name) {
    const m = name.match(/\s*\(V\.(\d+)\)\s*$/);
    if (m) {
      nameVersion = m[1];
      name = name.slice(0, m.index).trim();
    }
  }
  const expEl = row.querySelector('.product-attributes .expansion-symbol');
  const langEl = row.querySelector('.product-attributes span.icon[aria-label]:not(.expansion-symbol)');
  const priceEl = row.querySelector('.col-offer .price-container .color-primary') || row.querySelector('.mobile-offer-container .color-primary');
  const available = parseInt(row.querySelector('.item-count')?.textContent?.trim() ?? '', 10);
  if (!name || isNaN(available)) return null;
  return {
    articleId,
    name,
    expansion: expEl ? expEl.getAttribute('aria-label') || expEl.getAttribute('data-bs-original-title') : null,
    condition: row.querySelector('.article-condition span')?.textContent?.trim() || null,
    language: langEl ? (langEl.getAttribute('aria-label') || langEl.getAttribute('data-bs-original-title') || '').trim() || null : null,
    foil: !!row.querySelector('.product-attributes [aria-label="Foil"], .product-attributes [data-bs-original-title="Foil"]'),
    price: priceEl ? parsePrice(priceEl.textContent) : null,
    version: versionFromThumbnail(row) ?? nameVersion,
    available,
    cartButton: row.querySelector<HTMLButtonElement>('form[data-ajax-action="ShoppingCart_Add_AddArticlesFromUserOffers"] button[type="submit"]'),
    row,
  };
}

function rowMatches(item: PayloadItem, r: OfferRow): boolean {
  if (r.name !== item.n) return false;
  if (item.l && r.language && r.language !== item.l) return false;
  if (item.c && r.condition && r.condition !== item.c) return false;
  if (item.e && r.expansion && r.expansion !== item.e) return false;
  // A version requirement exists only when the optimizer's offer had one
  if (item.pv && r.version !== item.pv) return false;
  if (item.f === true && !r.foil) return false;
  if (item.f === false && r.foil) return false;
  if (item.p != null) {
    const wanted = parsePrice(item.p);
    if (wanted != null && (r.price == null || Math.abs(r.price - wanted) > 0.005)) return false;
  }
  return r.available >= 1 && !!r.cartButton;
}

// ---------------------------------------------------------------- cart interaction

function readCartTotal(): number | null {
  const span = document.getElementById('cart')?.querySelector('.text-muted');
  return span ? parsePrice(span.textContent) : null;
}

/** Click CardMarket's cart button for `qty` copies; verified = navbar total changed. */
async function addRowToCart(r: OfferRow, qty: number): Promise<{ added: number; verified: boolean }> {
  let requested = 1;
  if (qty > 1) {
    const select = ((r.articleId && document.getElementById('amount' + r.articleId)) ||
      r.row.querySelector('.actions-container select')) as HTMLSelectElement | null;
    if (select) {
      const values = Array.from(select.options).map((o) => parseInt(o.value, 10)).filter((v) => !isNaN(v));
      requested = Math.min(qty, values.length ? Math.max(...values) : 1);
      select.value = String(requested);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      console.warn(`[CardMarket Helper] No amount dropdown for article ${r.articleId} — adding 1 copy only`);
    }
  }
  const before = readCartTotal();
  r.cartButton!.click();
  let waited = 0;
  while (waited < cfg.cartUpdateTimeout) {
    await sleep(cfg.cartUpdatePoll);
    waited += cfg.cartUpdatePoll;
    const now = readCartTotal();
    if (before == null || (now != null && Math.abs(now - before) > 0.001)) return { added: requested, verified: true };
  }
  console.warn(`[CardMarket Helper] Cart total did not change within ${cfg.cartUpdateTimeout}ms after adding article ${r.articleId} — counting it as added (check your cart)`);
  return { added: requested, verified: false };
}

// ---------------------------------------------------------------- UI

const STATUS_ICON: Record<ItemState['status'], string> = { pending: '⏳', done: '✅', partial: '⚠️', notfound: '❌' };

function itemList(state: FillState, highlightCurrent: boolean) {
  return h('ul', { class: 'items' }, state.items.map((it, i) => {
    const detail = [it.l, it.c, it.e ? it.e + (it.pv ? ` (V.${it.pv})` : '') : null, it.p].filter(Boolean).join(' · ');
    return h('li', { class: highlightCurrent && i === state.current ? 'current' : '' },
      h('span', { class: 'st' }, STATUS_ICON[it.status]),
      h('span', { class: 'qty' }, `${it.added}/${it.q}`),
      h('span', { class: 'name' }, it.n, detail ? h('span', { class: 'detail' }, detail) : null));
  }));
}

function renderProgress(state: FillState, status?: string): void {
  const added = state.items.reduce((s, it) => s + it.added, 0);
  const total = state.items.reduce((s, it) => s + it.q, 0);
  const finished = state.items.filter((it) => it.status !== 'pending').length;
  showJob({
    icon: '🛒',
    title: 'Filling cart',
    subtitle: `Seller ${state.seller}`,
    progress: state.items.length ? finished / state.items.length : 0,
    stats: [['Listing', `${Math.min(state.current + 1, state.items.length)}/${state.items.length}`], ['Copies added', `${added}/${total}`]],
    status,
    details: itemList(state, true),
    badge: `${finished}/${state.items.length}`,
    actions: h('button', {
      class: 'btn danger grow',
      onClick: () => {
        clearState(); // pending sleeps notice via stopped()
        renderSummary(state, true);
      },
    }, '⏹ Stop'),
  });
}

function renderSummary(state: FillState, wasStopped = false): void {
  const added = state.items.reduce((s, it) => s + it.added, 0);
  const total = state.items.reduce((s, it) => s + it.q, 0);
  const missing = state.items.filter((it) => it.added < it.q);
  const unverified = state.items.reduce((s, it) => s + (it.unverified || 0), 0);
  showJob({
    icon: wasStopped ? '⏹' : missing.length ? '⚠️' : '✅',
    title: wasStopped ? 'Cart filler stopped' : missing.length ? 'Cart filled — with issues' : 'Cart filled',
    subtitle: `Seller ${state.seller}`,
    progress: total ? added / total : 1,
    tone: missing.length || wasStopped ? 'warning' : 'success',
    stats: [['Added', `${added}/${total}`], ['Missing', String(missing.length)]],
    status: unverified ? `${unverified} addition(s) not confirmed by the cart total — double-check your cart.` : undefined,
    details: itemList(state, false),
    actions: [
      h('a', { class: 'btn primary grow', href: 'https://www.cardmarket.com/en/Magic/ShoppingCart' }, 'Open cart'),
      h('button', { class: 'btn', onClick: hideJob }, 'Close'),
    ],
  });
}

// ---------------------------------------------------------------- flow

async function scanCurrentPage(state: FillState): Promise<void> {
  const item = state.items[state.current];
  renderProgress(state, `Scanning page for “${item.n}”…`);
  await sleep(randomDelay(cfg.delays.initialPageLoad));
  if (stopped()) return;

  const rows = Array.from(document.querySelectorAll('#UserOffersTable div.article-row, div.article-row'));
  let needed = item.q - item.added;
  for (const row of rows) {
    if (needed <= 0) break;
    const r = parseRow(row);
    if (!r || !rowMatches(item, r)) continue;
    renderProgress(state, `Adding “${item.n}” to the cart…`);
    const { added, verified } = await addRowToCart(r, Math.min(needed, r.available));
    item.added += added;
    if (!verified) item.unverified = (item.unverified || 0) + added;
    needed = item.q - item.added;
    if (stopped()) return;
    saveState(state);
    renderProgress(state);
    if (needed > 0) await sleep(randomDelay(cfg.delays.betweenCartAdds));
  }

  if (needed > 0) {
    // Not satisfied on this page — follow pagination if possible
    const nextHref = document.querySelector('a.pagination-control[data-direction="next"]:not(.disabled)')?.getAttribute('href');
    if (nextHref) {
      saveState(state);
      renderProgress(state, `“${item.n}”: checking the next page…`);
      await sleep(randomDelay(cfg.delays.betweenNavigation));
      if (stopped()) return;
      const next = new URL(nextHref, window.location.origin);
      next.searchParams.set(PAGE_MARKER_PARAM, String(state.current));
      window.location.href = next.href;
      return;
    }
  }

  item.status = item.added >= item.q ? 'done' : item.added > 0 ? 'partial' : 'notfound';
  console.log(`[CardMarket Helper] Cart filler "${item.n}": ${item.status} (${item.added}/${item.q})`);
  await advance(state);
}

async function advance(state: FillState): Promise<void> {
  state.current++;
  if (state.current < state.items.length) {
    saveState(state);
    renderProgress(state, `Next: “${state.items[state.current].n}”`);
    await sleep(randomDelay(cfg.delays.betweenNavigation));
    if (stopped()) return;
    window.location.href = itemUrl(state, state.current);
  } else {
    state.active = false;
    clearState();
    renderSummary(state);
  }
}

async function start(): Promise<void> {
  // Case 1: fresh payload in the URL hash (report button just clicked)
  if ((window.location.hash || '').includes(HASH_MARKER)) {
    if (!isEnglishVersion()) {
      window.location.href = englishUrl(); // parsing relies on English labels
      return;
    }
    const payload = readHashPayload();
    // Strip the hash so a manual reload doesn't restart the run
    history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!payload) return;
    const state: FillState = {
      active: true,
      seller: payload.seller,
      items: payload.items.map((it) => ({ ...it, added: 0, status: 'pending' as const })),
      current: 0,
    };
    saveState(state);
    renderProgress(state, 'Starting…');
    await sleep(randomDelay(cfg.delays.initialPageLoad));
    if (stopped()) return;
    window.location.href = itemUrl(state, state.current);
    return;
  }

  // Case 2: resuming an active run after one of our own navigations
  const state = loadState();
  if (!state || !state.active) return;
  const marker = new URLSearchParams(window.location.search).get(PAGE_MARKER_PARAM);
  if (marker === null) return; // the user browsed here on their own — don't interfere
  if (route.singlesSeller() !== state.seller) return;
  if (parseInt(marker, 10) !== state.current) {
    // Stale page (e.g. back button) — go to the expected one
    renderProgress(state, 'Returning to the current card…');
    await sleep(randomDelay(cfg.delays.betweenNavigation));
    if (stopped()) return;
    window.location.href = itemUrl(state, state.current);
    return;
  }
  await scanCurrentPage(state);
}

export function setupCartFiller(config: ResolvedConfig): void {
  cfg = config.cartFiller;
  if (route.singlesSeller()) void start();
  addMenuNote('🛒 Cart filler starts from the “Add to Cart” buttons of the optimizer report.');
}
