/** Reading offers from CardMarket card pages + filtering them. */
import type { ResolvedConfig } from '../../config';
import { CONDITION_IDS, LANGUAGE_IDS } from '../../core/cardmarket';
import { randomDelay, sleep } from '../../core/util';
import { toast } from '../../ui/toast';
import { Offer, PAGE_MARKER_PARAM, ScrapeCard } from './types';

type ScraperConfig = ResolvedConfig['scraper'];

/** /Cards/ pages list every printing and need expansion batching; /Singles/ don't. */
export function isCardPageUrl(url: string): boolean {
  return url.includes('/Cards/') && !url.includes('/Singles/');
}

export function extractExpansionIds(): string[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('#articleFilterProductExpansion input[type="checkbox"][name^="idExpansion"]'))
    .map((input) => input.value)
    .filter(Boolean);
}

export function buildFilterParams(card: ScrapeCard, cfg: ScraperConfig): string[] {
  const params: string[] = [];
  if (cfg.sellerCountry !== null) params.push(`sellerCountry=${cfg.sellerCountry}`);
  if (Array.isArray(card.languages)) {
    const codes = card.languages.map((lang) => LANGUAGE_IDS[lang]).filter((code) => code && Number(code) <= 11);
    if (codes.length > 0) params.push(`language=${codes.join(',')}`);
  }
  const cond = CONDITION_IDS[card.condition];
  if (cond) params.push(`minCondition=${cond}`);
  if (card.is_foil === true) params.push('isFoil=Y');
  else if (card.is_foil === false) params.push('isFoil=N');
  return params;
}

export function buildCardUrl(card: ScrapeCard, cfg: ScraperConfig): string {
  const base = card.link.split('?')[0];
  const params = buildFilterParams(card, cfg);
  return params.length ? `${base}?${params.join('&')}` : base;
}

export function buildCardUrlWithExpansions(baseUrl: string, params: string[], expansionIds: string[]): string {
  const all = [...params];
  if (expansionIds.length > 0) all.push(`idExpansion=${expansionIds.join(',')}`);
  return all.length ? `${baseUrl}?${all.join('&')}` : baseUrl;
}

export function withPageMarker(url: string, wishlistIndex: number, cardIndex: number): string {
  return `${url}${url.includes('?') ? '&' : '?'}${PAGE_MARKER_PARAM}=${wishlistIndex}-${cardIndex}`;
}

export function extractPriceTrend(): number | null {
  for (const dl of Array.from(document.querySelectorAll('dl.labeled'))) {
    const dts = dl.querySelectorAll('dt');
    const dds = dl.querySelectorAll('dd');
    for (let i = 0; i < dts.length; i++) {
      if (dts[i].textContent?.trim() === 'Price Trend') {
        const value = (dds[i]?.textContent ?? '').trim();
        const parsed = parseFloat(value.replace('€', '').replace(/\./g, '').trim().replace(',', '.'));
        return isNaN(parsed) ? null : parsed;
      }
    }
  }
  return null;
}

export function parseOffersFromPage(cardName: string): Offer[] {
  const rows = document.querySelectorAll('div.article-row');
  const offers: Offer[] = [];
  let skippedSpecial = 0;
  let skippedNonShippable = 0;
  let failed = 0;

  rows.forEach((row) => {
    // Oversized / promotional "special" items
    if (row.querySelector('svg[aria-label="Special"], svg[data-bs-original-title="Special"]')) {
      skippedSpecial++;
      return;
    }
    // Seller doesn't ship to the buyer's country
    if (row.querySelector('.actions-container a[aria-label*="cannot buy"], .actions-container a[data-bs-original-title*="cannot buy"]')) {
      skippedNonShippable++;
      return;
    }
    const sellerA = row.querySelector('.seller-name a');
    const seller = sellerA?.textContent?.trim() || null;
    const priceEl = row.querySelector('.col-offer .color-primary.text-end, .col-offer span.color-primary:not(.fonticon-check-circle)');
    const price = priceEl?.textContent?.trim() || null;
    if (!seller || !price) {
      console.warn(`[CardMarket Helper] Skipping offer row for ${cardName}: missing seller or price (seller="${seller}", price="${price}")`);
      failed++;
      return;
    }
    const expEl = row.querySelector('.product-attributes .expansion-symbol');
    const expansion = expEl ? expEl.getAttribute('aria-label') || expEl.getAttribute('data-bs-original-title') : null;
    const langEl = row.querySelector('.product-attributes span.icon[aria-label]:not(.expansion-symbol)');
    const lang = langEl ? langEl.getAttribute('aria-label') || langEl.getAttribute('data-bs-original-title') : null;
    const locLabel = row.querySelector('.seller-name .icon[aria-label]')?.getAttribute('aria-label');

    // The printing is known whenever the expansion is; only the version needs
    // the thumbnail tooltip (offers without a thumbnail have no version info)
    let version: string | null = null;
    const alt = row.querySelector('.thumbnail-icon')?.getAttribute('data-bs-title')?.match(/alt=\\?"([^"]+)\\?"/);
    if (alt) version = alt[1].match(/\(V\.(\d+)\)/)?.[1] ?? null;

    const countEl = row.querySelector('.item-count');
    if (!countEl) {
      console.warn(`[CardMarket Helper] Skipping offer row for ${cardName}: .item-count not found`);
      failed++;
      return;
    }
    const quantity = parseInt(countEl.textContent?.trim() ?? '', 10);
    if (isNaN(quantity)) {
      console.warn(`[CardMarket Helper] Skipping offer row for ${cardName}: unparseable quantity "${countEl.textContent?.trim()}"`);
      failed++;
      return;
    }
    const tracking = !!(
      row.querySelector(".untracked .icon[data-bs-original-title*='Untracked shipping is not eligible']") ||
      row.querySelector(".fonticon-check-circle[aria-label*='tracked shipping'], .fonticon-check-circle[data-bs-original-title*='tracked shipping']")
    );

    offers.push({
      seller,
      seller_link: sellerA?.getAttribute('href') ?? null,
      price,
      condition: row.querySelector('.article-condition span')?.textContent?.trim() || null,
      language: lang ? lang.trim() : null,
      location: locLabel ? locLabel.replace('Item location: ', '') : null,
      printing: expansion ? { expansion, version } : null,
      quantity,
      name: cardName,
      tracking_required: tracking,
    });
  });

  if (skippedSpecial) console.log(`[CardMarket Helper] Filtered out ${skippedSpecial} special offer(s) for ${cardName}`);
  if (skippedNonShippable) console.log(`[CardMarket Helper] Filtered out ${skippedNonShippable} non-shippable offer(s) for ${cardName}`);
  if (failed > 0) {
    toast('warning', `${failed} unparseable offer row(s) skipped for “${cardName}” — these offers are missing from the results. See the console for details.`);
  }
  return offers;
}

export function filterOffersByPrinting(offers: Offer[], card: ScrapeCard): Offer[] {
  if (!card.printings || card.printings.length === 0) return offers;
  return offers.filter((offer) => {
    if (!offer.printing) return true;
    return card.printings.some((wanted) =>
      offer.printing!.expansion === wanted.expansion && (!wanted.version || offer.printing!.version === wanted.version));
  });
}

export function filterOffersByLanguage(offers: Offer[], card: ScrapeCard): Offer[] {
  // Old exports may contain CardMarket's literal "Any" — same as no filter
  const wanted = (card.languages || []).filter((lang) => lang.toLowerCase() !== 'any');
  if (wanted.length === 0) return offers;
  return offers.filter((offer) => !offer.language || wanted.includes(offer.language));
}

/** Click "Load More" until every offer is on the page, at a human pace. */
export async function loadAllOffers(cfg: ScraperConfig): Promise<void> {
  await sleep(randomDelay(cfg.delays.firstScrape));
  let clicks = 0;
  for (;;) {
    const button = document.getElementById('loadMoreButton');
    if (!button || button.style.display === 'none') break;
    try {
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(100 + Math.random() * 50);
      button.click();
      clicks++;
      await sleep(randomDelay(cfg.delays.betweenLoadMore));
      for (let waited = 0; waited < 10000; waited += 200) {
        const loader = document.querySelector<HTMLElement>('div.loader.small');
        if (!loader || loader.style.display === 'none') break;
        await sleep(200);
      }
      await sleep(randomDelay(cfg.delays.afterLoadingComplete));
    } catch (e) {
      console.error('[CardMarket Helper] Load more button not clickable:', e);
      toast('warning', 'Could not click “Load More” — the offers list for this card may be incomplete.');
      break;
    }
  }
  console.log(`[CardMarket Helper] All offers loaded (${clicks} "Load More" clicks)`);
}
