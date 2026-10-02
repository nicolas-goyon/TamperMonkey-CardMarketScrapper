/**
 * Wishlist exporter: on /Magic/Wants/<id>, exports the wants list to
 * <account>_<name>_<id>.wishlist.json (the format the offers scraper reads).
 */
import { route } from '../core/cardmarket';
import { downloadJSON, sleep, waitFor } from '../core/util';
import { addAction } from '../ui/launcher';
import { toast } from '../ui/toast';
import { ensureEnglishForExport, safeFilePart, takeResumeFlag } from './common';

const RESUME_FLAG = 'cardmarket_auto_export';

export interface WishlistPrinting {
  expansion: string;
  version: string | null;
}

export interface WishlistCard {
  amount: number;
  name: string;
  printings: WishlistPrinting[];
  languages: string[];
  condition: string;
  link: string;
  max_price: number | null;
  is_foil: boolean | null;
}

export interface WishlistFile {
  id: string;
  name: string;
  account: string;
  cards: WishlistCard[];
}

function getAccountName(): string | null {
  const desktop = document.querySelector('#account-dropdown .d-none.d-lg-block');
  if (desktop?.textContent?.trim()) return desktop.textContent.trim();
  const mobile = document.querySelector('.dropdown-header span');
  if (mobile?.textContent?.trim()) return mobile.textContent.trim();
  return null;
}

function getWishlistName(): string | null {
  const heading = document.querySelector('h1');
  if (heading) {
    // Ignore the count badge CardMarket may render inside the heading
    const clone = heading.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.badge').forEach((b) => b.remove());
    const text = clone.textContent?.trim();
    if (text) return text;
  }
  const title = document.querySelector('.page-title, .wishlist-title');
  return title?.textContent?.trim() || null;
}

/** Total stated by the page (pagination counter or heading badge), if any. */
function getStatedTotalCardCount(): number | null {
  try {
    for (const span of Array.from(document.querySelectorAll('.pagination span, .row.pagination span'))) {
      const match = (span.textContent ?? '').match(/\d[\d.,]*\s*(?:to|-)\s*\d[\d.,]*\s*(?:of|\/)\s*(\d[\d.,]*)/i);
      if (match) {
        const total = parseInt(match[1].replace(/[.,\s]/g, ''), 10);
        if (!isNaN(total) && total > 0) return total;
      }
    }
    const badge = document.querySelector('h1 .badge');
    if (badge) {
      const total = parseInt((badge.textContent ?? '').replace(/[.,\s]/g, ''), 10);
      if (!isNaN(total) && total > 0) return total;
    }
  } catch (error) {
    console.warn('[CardMarket Helper] Could not read the stated total card count:', error);
  }
  return null;
}

function parsePrintings(cell: Element | null): WishlistPrinting[] {
  if (!cell) return [];
  return Array.from(cell.querySelectorAll('.expansion-symbol')).map((el) => {
    const setName = el.getAttribute('aria-label')?.trim() || '';
    if (setName.includes(' Version ')) {
      const [expansion, version] = setName.split(' Version ');
      return { expansion, version: version || null };
    }
    return { expansion: setName, version: null };
  });
}

/**
 * Locate the Foil column from the table header (text, tooltip attributes or
 * icon class) so a column reorder can't silently flip foil/signed/altered.
 */
function getFoilColumnIndex(row: Element): number {
  const headerRow = row.closest('table')?.querySelector('thead tr');
  if (!headerRow) return -1;
  return Array.from(headerRow.children).findIndex((cell) => /foil/i.test(cell.outerHTML));
}

let warnedFoilFallback = false;
function parseFoilPreference(row: HTMLTableRowElement): boolean | null {
  const index = getFoilColumnIndex(row);
  const candidate = index >= 0 ? row.children[index] : null;
  let foilCell: Element | null;
  if (candidate && candidate.classList.contains('ternary-header')) {
    foilCell = candidate;
  } else {
    if (!warnedFoilFallback) {
      warnedFoilFallback = true;
      console.warn('[CardMarket Helper] Could not locate the Foil column from the table header; falling back to the first ternary column.');
    }
    foilCell = row.querySelector('td.ternary-header');
  }
  if (foilCell?.querySelector('span[name="yes"]')) return true;
  if (foilCell?.querySelector('span[name="no"]')) return false;
  return null; // Any
}

function parseCardRow(row: HTMLTableRowElement): WishlistCard | null {
  try {
    const amountText = row.querySelector('td.amount')?.textContent?.trim() || '';
    const amount = parseInt(amountText, 10);
    if (isNaN(amount) || amount < 1) {
      // Never export amount 0 — downstream it means "need none"
      console.warn(`[CardMarket Helper] Skipping wishlist row: no valid amount in "${amountText}"`, row);
      return null;
    }
    const nameEl = row.querySelector('td.name a');
    const link = nameEl?.getAttribute('href') || '';
    // Pinned printings show "(V.n)" after the name; printings[] already
    // carries the version and every consumer matches on the plain name.
    const name = (nameEl?.textContent?.trim() || '').replace(/\s*\(V\.\d+\)\s*$/, '');
    // "Any" (no language restriction) must become [] — not a language named "Any"
    const languages = Array.from(row.querySelectorAll('td.languages span.visually-hidden'))
      .map((span) => span.textContent?.trim() || '')
      .filter((lang) => lang && lang.toLowerCase() !== 'any');
    const condition = row.querySelector('td.condition span.visually-hidden')?.textContent?.trim() || '';
    let maxPrice: number | null = null;
    const priceData = row.querySelector('td.buyPrice')?.getAttribute('data-text');
    if (priceData && priceData.trim()) {
      const value = parseFloat(priceData);
      if (value > 0) maxPrice = value;
    }
    return {
      amount,
      name,
      printings: parsePrintings(row.querySelector('td.expansion')),
      languages,
      condition,
      link,
      max_price: maxPrice,
      is_foil: parseFoilPreference(row),
    };
  } catch (error) {
    console.error('[CardMarket Helper] Error parsing card row:', error);
    return null;
  }
}

async function exportWishlist(): Promise<void> {
  if (ensureEnglishForExport(RESUME_FLAG)) return;

  const wishlistId = route.wishlistId();
  if (!wishlistId) {
    toast('error', 'Could not determine the wishlist id from the URL.');
    return;
  }
  const table = await waitFor(() => document.querySelector('table.table thead'), 10000);
  if (!table) {
    toast('error', 'The wishlist table did not load — reload the page and try again.');
    return;
  }
  const account = getAccountName();
  if (!account) {
    toast('error', 'Could not determine your account name. Make sure you are logged in to CardMarket.');
    return;
  }
  const name = getWishlistName();
  if (!name) {
    toast('error', 'Could not determine the wishlist name. Wait for the page to finish loading.');
    return;
  }

  const cards: WishlistCard[] = [];
  let failedRows = 0;
  document.querySelectorAll<HTMLTableRowElement>('table.table tbody tr[role="row"]').forEach((row) => {
    const card = parseCardRow(row);
    if (card && card.name) cards.push(card);
    else failedRows++;
  });

  if (cards.length === 0) {
    toast('error', 'No cards found in this wishlist.');
    return;
  }

  const wishlist: WishlistFile = { id: wishlistId, name, account, cards };
  const filename = `${safeFilePart(account, 100)}_${safeFilePart(name)}_${wishlistId}.wishlist.json`;
  downloadJSON(wishlist, filename);
  console.log(`[CardMarket Helper] Exported ${cards.length} cards from wishlist ${wishlistId} (${account})`);
  toast('success', `${cards.length} card(s) exported to ${filename}`, { title: `“${name}” exported` });

  if (failedRows > 0) {
    toast('warning', `${failedRows} row(s) could not be parsed and are missing from the export. See the browser console for details.`);
  }
  // Long wishlists span several pages: only the rendered rows are exported
  const statedTotal = getStatedTotalCardCount();
  if (statedTotal !== null && cards.length !== statedTotal) {
    toast('warning', `Exported ${cards.length} card(s) but the page reports ${statedTotal}. If the list spans several pages, only the displayed page was exported — increase the page size or export each page.`);
  }
}

export function setupWishlistExporter(): void {
  if (!route.wishlistId()) return;
  addAction({
    id: 'wishlist-export',
    section: 'This page',
    icon: '📥',
    label: 'Export this wishlist',
    description: 'Download it as .wishlist.json for the offers scraper',
    run: exportWishlist,
  });
  if (takeResumeFlag(RESUME_FLAG)) {
    void sleep(1000).then(exportWishlist);
  }
}
