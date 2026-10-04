/**
 * Shopping-cart exporter: exports the live cart (cards, prices, per-card
 * shipping/trust) to shopping_cart_<timestamp>.json for merge_and_report.py.
 * Also works on the checkout success page ("Thank you for your purchase"),
 * which lists the same articles grouped by shipment — handy when the cart
 * wasn't exported before paying.
 */
import { isEnglishVersion, KNOWN_LANGUAGES, route } from '../core/cardmarket';
import { downloadJSON, errorMessage, parsePrice, sleep } from '../core/util';
import { addAction } from '../ui/launcher';
import { toast } from '../ui/toast';
import { ensureEnglishForExport, takeResumeFlag } from './common';

const RESUME_FLAG = 'cardmarket_auto_export_cart';

/** Row schema consumed by merge_and_report.load_shopping_cart (keep in sync). */
export interface CartRow {
  card_name: string;
  quantity: number;
  unit_price: number;
  price_str: string;
  seller: string;
  language: string;
  expansion: string;
  shipping_per_card: number;
  trust_per_card: number;
  total_cost_per_card: number;
  total_cost: number;
}

function strictPrice(text: string): number {
  const value = parsePrice(text);
  if (value === null) throw new Error(`Failed to parse price: ${text}`);
  return value;
}

/** The info cell holds several labelled icons — only accept a known language. */
function extractLanguage(infoCell: Element): string {
  const spans = infoCell.querySelectorAll('span[data-bs-original-title], span[data-original-title], span[aria-label]');
  for (const span of Array.from(spans)) {
    for (const attr of ['data-bs-original-title', 'data-original-title', 'aria-label']) {
      const label = span.getAttribute(attr);
      if (label && (KNOWN_LANGUAGES as readonly string[]).includes(label)) return label;
    }
  }
  throw new Error('Could not extract language from info cell');
}

function extractExpansion(infoCell: Element): string {
  const link = infoCell.querySelector('a.expansion-symbol');
  const expansion = link?.getAttribute('aria-label') || link?.getAttribute('data-bs-original-title');
  if (expansion) return expansion;
  throw new Error('Could not extract expansion from info cell');
}

function quantityOf(row: Element): number {
  const cell = row.querySelector('td.amount');
  if (!cell) throw new Error('Missing amount cell in row');
  const match = (cell.textContent ?? '').match(/(\d+)/);
  if (!match) throw new Error(`Could not parse quantity from: ${cell.textContent}`);
  return parseInt(match[1], 10);
}

/**
 * One seller's articles: `root` holds the seller link and the article table,
 * `data` carries the data-article-count / item-value / shipping / trust attributes.
 *  - Shopping cart: <section id="seller…" data-…> (both on the section)
 *  - Checkout success: <div class="shipment-block"> with <div class="summary" data-…> inside
 */
interface SellerBlock {
  root: HTMLElement;
  data: HTMLElement;
}

function sellerBlocks(): SellerBlock[] {
  const cartSections = Array.from(document.querySelectorAll<HTMLElement>('section[id^="seller"]'));
  if (cartSections.length > 0) return cartSections.map((s) => ({ root: s, data: s }));
  return Array.from(document.querySelectorAll<HTMLElement>('div.shipment-block')).map((block) => ({
    root: block,
    // A shipment block without its summary fails below with a clear message
    data: block.querySelector<HTMLElement>('div.summary[data-article-count]') ?? block,
  }));
}

function extractCart(): { cards: CartRow[]; failedRows: number; failedSellers: number } {
  const cards: CartRow[] = [];
  let failedRows = 0;
  let failedSellers = 0;

  sellerBlocks().forEach(({ root: section, data }) => {
    // One broken seller section is skipped and reported, not fatal
    try {
      const seller = section.querySelector('a[href*="/Users/"]')?.textContent?.trim();
      if (!seller) throw new Error('Could not extract seller name from section');
      const ds = data.dataset;
      const articleCount = parseInt(ds.articleCount ?? '', 10);
      const itemValue = parseFloat(ds.itemValue ?? '');
      const shipping = parseFloat(ds.shipCost || ds.shippingPrice || '');
      const trust = parseFloat(ds.serviceCost || ds.internalInsurance || '');
      if ([articleCount, itemValue, shipping, trust].some(isNaN)) {
        throw new Error(`Missing or invalid seller data attributes for seller: ${seller}`);
      }
      const table = section.querySelector('table.article-table, table.product-table');
      if (!table) throw new Error(`No article table found for seller: ${seller}`);
      const rows = Array.from(table.querySelectorAll('tr[data-article-id]'));
      const totalCards = rows.reduce((sum, r) => sum + quantityOf(r), 0);
      if (totalCards === 0) throw new Error(`Total cards for seller ${seller} is 0`);
      const shippingPerCard = shipping / totalCards;
      const trustPerCard = trust / totalCards;

      rows.forEach((row) => {
        try {
          const name = row.querySelector('td.name a')?.textContent?.trim();
          if (!name) throw new Error('Missing name cell/link');
          const priceText = row.querySelector('td.price')?.textContent?.trim();
          if (!priceText) throw new Error(`Missing price cell for card: ${name}`);
          const unitPrice = strictPrice(priceText);
          const info = row.querySelector('td.info');
          if (!info) throw new Error(`Missing info cell for card: ${name}`);
          const quantity = quantityOf(row);
          const perCard = unitPrice + shippingPerCard + trustPerCard;
          cards.push({
            card_name: name,
            quantity,
            unit_price: unitPrice,
            price_str: priceText,
            seller,
            language: extractLanguage(info),
            expansion: extractExpansion(info),
            shipping_per_card: shippingPerCard,
            trust_per_card: trustPerCard,
            total_cost_per_card: perCard,
            total_cost: perCard * quantity,
          });
        } catch (e) {
          console.warn('[CardMarket Helper] Failed to parse cart row:', e);
          failedRows++;
        }
      });
    } catch (e) {
      console.warn('[CardMarket Helper] Failed to parse seller section:', e);
      failedSellers++;
    }
  });
  return { cards, failedRows, failedSellers };
}

function isCheckoutSuccess(): boolean {
  return /\/ShoppingCart\/Checkout\/Success/.test(window.location.pathname);
}

function exportCart(): void {
  if (isCheckoutSuccess()) {
    // This page can't be reloaded on /en/ (it's only shown right after paying),
    // so don't redirect — and the parser needs English labels.
    if (!isEnglishVersion()) {
      toast('error', 'The checkout page can only be exported in English. Next time, switch the site to English before checking out — or export the cart before paying.');
      return;
    }
  } else if (ensureEnglishForExport(RESUME_FLAG)) {
    return;
  }
  try {
    const { cards, failedRows, failedSellers } = extractCart();
    if (cards.length === 0) {
      toast('error', isCheckoutSuccess() ? 'No cards found on this checkout page.' : 'No cards found in the shopping cart.');
      return;
    }
    const sum = (f: (c: CartRow) => number) => cards.reduce((s, c) => s + f(c), 0);
    const sellers = new Set(cards.map((c) => c.seller)).size;
    const total = sum((c) => c.total_cost);
    console.log('[CardMarket Helper] Cart export', {
      cards: cards.length,
      value: sum((c) => c.unit_price * c.quantity).toFixed(2),
      shipping: sum((c) => c.shipping_per_card * c.quantity).toFixed(2),
      trust: sum((c) => c.trust_per_card * c.quantity).toFixed(2),
      total: total.toFixed(2),
      sellers,
    });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `shopping_cart_${timestamp}.json`;
    downloadJSON(cards, filename);
    toast('success', `${cards.length} line(s) from ${sellers} seller(s) · ${total.toFixed(2)} € total\n${filename}`, { title: 'Shopping cart exported' });

    if (failedRows > 0 || failedSellers > 0) {
      const parts = [];
      if (failedSellers > 0) parts.push(`${failedSellers} seller section(s)`);
      if (failedRows > 0) parts.push(`${failedRows} cart row(s)`);
      toast('warning', `${parts.join(' and ')} could not be parsed and were skipped — the export is incomplete${failedSellers > 0 ? ' (per-seller totals in the comparison will be off)' : ''}. See the console for details.`);
    }
  } catch (error) {
    console.error('[CardMarket Helper] Error exporting shopping cart:', error);
    toast('error', `Export failed: ${errorMessage(error)}`);
  }
}

export function setupCartExporter(): void {
  if (!route.isShoppingCart()) return;
  addAction({
    id: 'cart-export',
    section: 'This page',
    icon: '🧾',
    label: 'Export shopping cart',
    description: isCheckoutSuccess()
      ? 'Download the purchased shipments as cart JSON to compare with the optimizer report'
      : 'Download it as JSON to compare with the optimizer report',
    run: exportCart,
  });
  if (takeResumeFlag(RESUME_FLAG)) {
    void sleep(1500).then(exportCart);
  }
}
