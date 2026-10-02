/**
 * The scrape run: one card per page load. State lives in GM storage (shared
 * by all tabs, survives navigation); each page scrapes the current card, saves
 * its offers, and navigates to the next card's URL stamped with a page marker.
 */
import type { ResolvedConfig } from '../../config';
import { storage } from '../../core/gm';
import { downloadJSON, errorMessage, formatDuration, randomDelay, sleep } from '../../core/util';
import { h } from '../../ui/dom';
import { hideJob, showJob } from '../../ui/jobPanel';
import { openModal } from '../../ui/modal';
import {
  buildCardUrl, buildCardUrlWithExpansions, buildFilterParams, extractExpansionIds, extractPriceTrend,
  filterOffersByLanguage, filterOffersByPrinting, isCardPageUrl, loadAllOffers, parseOffersFromPage, withPageMarker,
} from './parse';
import { BATCH_STATE_KEY, BatchState, Offer, PAGE_MARKER_PARAM, STATE_KEY, ScrapeCard, ScrapeResult, ScrapeState } from './types';

type ScraperConfig = ResolvedConfig['scraper'];
let cfg: ScraperConfig;

export function initRunner(config: ScraperConfig): void {
  cfg = config;
}

const getState = () => storage.get<ScrapeState>(STATE_KEY);
const totalCards = (s: ScrapeState) => s.wishlists.reduce((sum, w) => sum + w.cards.length, 0);
const scrapedCards = (results: ScrapeState['results']) => results.reduce((sum, r) => (r ? sum + r.card_offers.length : sum), 0);
/** The stop button writes the flag to storage; our in-memory copy would clobber it. */
const stopRequested = () => !!getState()?.stopRequested;

function clearRun(): void {
  storage.delete(STATE_KEY);
  storage.delete(BATCH_STATE_KEY);
}

export function exportData(result: ScrapeResult) {
  return { wishlists_metadata: result.wishlists_metadata || [], offers: result.card_offers };
}

/** Start a fresh run on the merged card list (called from the recap modal). */
export async function startRun(cards: ScrapeCard[], wishlistIds: string[], metadata: ScrapeState['wishlistsMetadata']): Promise<void> {
  const state: ScrapeState = {
    wishlists: [{ id: 'MERGED_' + wishlistIds.join('_'), cards }],
    currentWishlistIndex: 0,
    currentCardIndex: 0,
    results: [],
    startTime: Date.now(),
    isMerged: true,
    sourceWishlistIds: wishlistIds,
    wishlistsMetadata: metadata,
  };
  storage.delete(BATCH_STATE_KEY); // leftover from a stopped/crashed run
  storage.set(STATE_KEY, state);
  renderProgress(state, 'Opening the first card…');
  await sleep(800);
  window.location.href = withPageMarker(buildCardUrl(cards[0], cfg), 0, 0);
}

// ---------------------------------------------------------------- page entry

export type ResumeVerdict = 'none' | 'resume' | 'other-tab' | 'stale-tab';

/** Decide whether this page load is the one driving the current run. */
export function checkResume(): ResumeVerdict {
  const state = getState();
  if (!state || !state.wishlists || state.wishlists.length === 0) return 'none';
  const expected = `${state.currentWishlistIndex}-${state.currentCardIndex}`;
  const actual = new URLSearchParams(window.location.search).get(PAGE_MARKER_PARAM);
  if (actual === null) return 'other-tab';
  if (actual !== expected) {
    console.warn(`[CardMarket Helper] Page marker "${actual}" ≠ scrape position "${expected}" — ignoring stale tab.`);
    return 'stale-tab';
  }
  return 'resume';
}

export function showOtherTabNotice(): void {
  const state = getState();
  if (!state) return;
  const done = state.wishlists.slice(0, state.currentWishlistIndex).reduce((s, w) => s + w.cards.length, 0) + state.currentCardIndex;
  showJob({
    icon: '🔍',
    title: 'Offers scrape running in another tab',
    subtitle: 'This tab will not interfere with it',
    progress: totalCards(state) ? done / totalCards(state) : null,
    stats: [['Card', `${done + 1}/${totalCards(state)}`]],
    badge: `${done}/${totalCards(state)}`,
    actions: [
      h('button', { class: 'btn danger', onClick: requestStop, title: 'The scraping tab stops after its current card' }, '⛔ Stop it'),
      h('button', { class: 'btn', onClick: hideJob }, 'Hide'),
      h('button', {
        class: 'btn',
        title: 'Use if the scraping tab was closed: discards the run state (partial results are lost unless already downloaded)',
        onClick: () => {
          if (confirm('Discard the running scrape? Use this only if the tab that was scraping is gone.\nPartial results not yet downloaded will be lost.')) {
            clearRun();
            hideJob();
          }
        },
      }, 'Reset'),
    ],
  });
}

export async function resumeRun(): Promise<void> {
  const state = getState();
  if (!state) return;
  renderProgress(state);
  await sleep(randomDelay(cfg.delays.initialPageLoad));

  const latest = getState();
  if (!latest) {
    showJob({ icon: '❌', title: 'Scrape state lost', progress: 0, tone: 'warning', status: 'No scraping state found in storage — restart from the wishlist files.', actions: h('button', { class: 'btn grow', onClick: hideJob }, 'Close') });
    return;
  }
  if (latest.stopRequested) {
    finish(latest, true);
    return;
  }
  if (latest.currentWishlistIndex >= latest.wishlists.length) {
    finish(latest, false);
    return;
  }
  const card = latest.wishlists[latest.currentWishlistIndex].cards[latest.currentCardIndex];
  try {
    await processCard(latest, card);
  } catch (e) {
    console.error(`[CardMarket Helper] Error while scraping "${card.name}":`, e);
    showErrorModal(latest, card, e);
  }
}

// ---------------------------------------------------------------- one card

async function processCard(state: ScrapeState, card: ScrapeCard): Promise<void> {
  const { currentWishlistIndex: wi, currentCardIndex: ci } = state;
  const wishlist = state.wishlists[wi];
  let offers: Offer[];
  let priceTrend: number | null;

  if (isCardPageUrl(window.location.href)) {
    let batch = storage.get<BatchState>(BATCH_STATE_KEY) ?? null;
    // A leftover batch state from another card would merge its offers into this one
    if (batch && (batch.wishlistIndex !== wi || batch.cardIndex !== ci)) {
      storage.delete(BATCH_STATE_KEY);
      batch = null;
    }
    if (batch && batch.currentBatchIndex >= 0) {
      // Don't re-parse a page whose offers are already in allOffers (reload
      // after the batch state was saved): go to the expected batch instead
      const expected = batch.batches[batch.currentBatchIndex];
      if (new URLSearchParams(window.location.search).get('idExpansion') !== expected.join(',')) {
        renderProgress(state, `Returning to expansion batch ${batch.currentBatchIndex + 1}/${batch.totalBatches}…`);
        await sleep(randomDelay(cfg.delays.cardNavigation));
        window.location.href = withPageMarker(buildCardUrlWithExpansions(batch.baseUrl, batch.params, expected), wi, ci);
        return;
      }
      renderProgress(state, `Expansion batch ${batch.currentBatchIndex + 1}/${batch.totalBatches}: loading offers…`);
      await loadAllOffers(cfg);
      await sleep(randomDelay(cfg.delays.afterLoadingComplete));
      const batchOffers = parseOffersFromPage(card.name);
      if (batch.currentBatchIndex === 0 && !batch.priceTrend) batch.priceTrend = extractPriceTrend();
      // Batches use disjoint idExpansion filters: no cross-batch duplicates to remove
      batch.allOffers.push(...batchOffers);
      batch.currentBatchIndex++;

      if (batch.currentBatchIndex < batch.totalBatches) {
        if (stopRequested()) return finish(state, true);
        storage.set(BATCH_STATE_KEY, batch);
        renderProgress(state, `Next expansion batch ${batch.currentBatchIndex + 1}/${batch.totalBatches}…`);
        await sleep(randomDelay(cfg.delays.cardNavigation));
        const next = buildCardUrlWithExpansions(batch.baseUrl, batch.params, batch.batches[batch.currentBatchIndex]);
        window.location.href = withPageMarker(next, wi, ci);
        return;
      }
      offers = batch.allOffers;
      priceTrend = batch.priceTrend;
      storage.delete(BATCH_STATE_KEY);
    } else {
      const baseUrl = window.location.href.split('?')[0];
      const params = buildFilterParams(card, cfg);
      const ids = extractExpansionIds();
      if (ids.length <= cfg.expansionBatchSize) {
        // Everything fits in one page (also covers "no expansion filter found")
        renderProgress(state, 'Loading offers…');
        await loadAllOffers(cfg);
        await sleep(randomDelay(cfg.delays.afterLoadingComplete));
        offers = parseOffersFromPage(card.name);
        priceTrend = extractPriceTrend();
      } else {
        const batches: string[][] = [];
        for (let i = 0; i < ids.length; i += cfg.expansionBatchSize) batches.push(ids.slice(i, i + cfg.expansionBatchSize));
        const fresh: BatchState = {
          wishlistIndex: wi, cardIndex: ci, baseUrl, params, batches,
          currentBatchIndex: 0, totalBatches: batches.length, allOffers: [], priceTrend: null,
        };
        if (stopRequested()) return finish(state, true);
        storage.set(BATCH_STATE_KEY, fresh);
        renderProgress(state, `${ids.length} printings — scanning in ${batches.length} batches…`);
        await sleep(randomDelay(cfg.delays.cardNavigation));
        window.location.href = withPageMarker(buildCardUrlWithExpansions(baseUrl, params, batches[0]), wi, ci);
        return;
      }
    }
  } else {
    renderProgress(state, 'Loading offers…');
    await loadAllOffers(cfg);
    await sleep(randomDelay(cfg.delays.afterLoadingComplete));
    offers = parseOffersFromPage(card.name);
    priceTrend = extractPriceTrend();
  }

  const byPrinting = filterOffersByPrinting(offers, card);
  const filtered = filterOffersByLanguage(byPrinting, card);
  console.log(`[CardMarket Helper] ${card.name}: ${offers.length} offers, ${byPrinting.length} matching printings, ${filtered.length} matching printings+language`);

  if (!state.results) state.results = [];
  if (!state.results[wi]) {
    state.results[wi] = { wishlist_id: wishlist.id, card_offers: [], wishlists_metadata: state.wishlistsMetadata || [] };
  }
  const { wishlist_id: _a, wishlist_account: _b, wishlist_name: _c, ...wished } = card;
  state.results[wi]!.card_offers.push({ wished_card: wished, offers: filtered, price_trend: priceTrend });

  const scraped = scrapedCards(state.results);
  if (cfg.autoDownloadEvery > 0 && scraped % cfg.autoDownloadEvery === 0) {
    state.results.forEach((r, i) => {
      if (r) setTimeout(() => downloadJSON(exportData(r), `offers_${r.wishlist_id}_partial.json`), i * 500);
    });
  }

  if (ci + 1 < wishlist.cards.length) state.currentCardIndex++;
  else {
    state.currentWishlistIndex++;
    state.currentCardIndex = 0;
  }
  if (stopRequested()) return finish(state, true);
  storage.set(STATE_KEY, state);

  if (state.currentWishlistIndex < state.wishlists.length) {
    const next = state.wishlists[state.currentWishlistIndex].cards[state.currentCardIndex];
    renderProgress(state, `${filtered.length} offer(s) kept · next: ${next.name}`);
    await sleep(randomDelay(cfg.delays.cardNavigation));
    window.location.href = withPageMarker(buildCardUrl(next, cfg), state.currentWishlistIndex, state.currentCardIndex);
  } else {
    finish(state, false);
  }
}

// ---------------------------------------------------------------- UI

function requestStop(): void {
  const state = getState();
  if (!state) return;
  state.stopRequested = true;
  storage.set(STATE_KEY, state);
  const current = getState();
  if (current) renderProgress(current, 'Stopping after the current card…');
}

function renderProgress(state: ScrapeState, status?: string): void {
  const total = totalCards(state);
  const done = state.wishlists.slice(0, state.currentWishlistIndex).reduce((s, w) => s + w.cards.length, 0) + state.currentCardIndex;
  const elapsed = Date.now() - state.startTime;
  const stats: Array<[string, string]> = [['Card', `${Math.min(done + 1, total)}/${total}`], ['Elapsed', formatDuration(elapsed)]];
  if (done > 0) stats.push(['ETA', `~${formatDuration((elapsed / done) * (total - done))}`]);
  const current = state.wishlists[state.currentWishlistIndex]?.cards[state.currentCardIndex];
  showJob({
    icon: '🔍',
    title: 'Scraping offers',
    subtitle: current ? current.name : undefined,
    progress: total ? done / total : 0,
    stats,
    status: state.stopRequested ? 'Stopping after the current card…' : status,
    badge: `${done}/${total}`,
    actions: h('button', { class: 'btn danger grow', disabled: !!state.stopRequested, onClick: requestStop }, state.stopRequested ? 'Stopping…' : '⛔ Stop scraping'),
  });
}

function finish(state: ScrapeState, stoppedEarly: boolean): void {
  clearRun();
  const results = (state.results || []).filter((r): r is ScrapeResult => !!r);
  const scraped = scrapedCards(results);
  const total = totalCards(state);
  const elapsed = formatDuration(Date.now() - state.startTime);

  showJob({
    icon: stoppedEarly ? '⏹' : '✅',
    title: stoppedEarly ? 'Scrape stopped' : 'Scrape complete',
    subtitle: `${scraped}/${total} cards · ${elapsed}`,
    progress: total ? scraped / total : 1,
    tone: stoppedEarly ? 'warning' : 'success',
    actions: h('button', { class: 'btn grow', onClick: hideJob }, 'Close'),
  });

  const download = (r: ScrapeResult) => downloadJSON(exportData(r), `offers_${r.wishlist_id}.json`);
  const modal = openModal({
    title: stoppedEarly ? 'Scrape stopped — partial results' : 'Scrape complete',
    subtitle: stoppedEarly
      ? `${scraped} of ${total} cards were scraped. The file below contains them.`
      : `Offers collected for ${scraped} card(s) in ${elapsed}.`,
    body: h('div', { class: 'stack' },
      h('div', { class: `callout ${stoppedEarly ? 'warning' : 'success'}` },
        'The file downloads automatically. Feed it to the optimizer: ',
        h('code', null, 'python cardmarket_helper/optimize_purchases.py --offers-file <file>')),
      results.length === 0
        ? h('div', { class: 'muted' }, 'No card was scraped yet, nothing to download.')
        : h('div', { class: 'dl-list' }, results.map((r) => {
          const offers = r.card_offers.reduce((s, co) => s + co.offers.length, 0);
          return h('div', { class: 'dl-item' },
            h('span', null, '📄'),
            h('div', { class: 'grow' },
              h('div', { class: 'fname' }, `offers_${r.wishlist_id}.json`),
              h('div', { class: 'muted small' }, `${r.card_offers.length} cards · ${offers} offers`)),
            h('button', { class: 'btn primary sm', onClick: () => download(r) }, 'Download again'));
        }))),
    footer: h('button', { class: 'btn', onClick: () => modal.close() }, 'Close'),
  });
  // Auto-download (staggered so the browser doesn't block multiple files)
  results.forEach((r, i) => setTimeout(() => download(r), 1000 + i * 500));
}

function showErrorModal(state: ScrapeState, card: ScrapeCard, error: unknown): void {
  showJob({ icon: '❌', title: 'Scrape paused on an error', subtitle: card.name, progress: null, tone: 'warning', status: errorMessage(error), badge: '!' });
  const modal = openModal({
    title: 'Error while scraping a card',
    dismissible: false,
    body: h('dl', { class: 'kv' },
      h('dt', null, 'Card'), h('dd', null, card.name),
      h('dt', null, 'Error'), h('dd', null, errorMessage(error))),
    footer: [
      h('button', {
        class: 'btn danger',
        onClick: () => {
          modal.close();
          finish(state, true);
        },
      }, '⛔ Stop & download partial results'),
      h('button', { class: 'btn', onClick: () => window.location.reload() }, '🔄 Retry'),
      h('button', {
        class: 'btn primary',
        onClick: () => {
          modal.close();
          const wishlist = state.wishlists[state.currentWishlistIndex];
          if (state.currentCardIndex + 1 < wishlist.cards.length) state.currentCardIndex++;
          else {
            state.currentWishlistIndex++;
            state.currentCardIndex = 0;
          }
          storage.delete(BATCH_STATE_KEY); // drop the failed card's batch progress
          if (stopRequested()) state.stopRequested = true;
          if (state.currentWishlistIndex < state.wishlists.length && !state.stopRequested) {
            storage.set(STATE_KEY, state);
            const next = state.wishlists[state.currentWishlistIndex].cards[state.currentCardIndex];
            window.location.href = withPageMarker(buildCardUrl(next, cfg), state.currentWishlistIndex, state.currentCardIndex);
          } else {
            finish(state, !!state.stopRequested);
          }
        },
      }, '⏭ Skip card & continue'),
    ],
  });
}
