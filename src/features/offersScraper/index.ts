/**
 * Offers scraper: pick one or more .wishlist.json files, review the merged
 * card list (resolving conflicting requirements), then scrape every card's
 * offers into offers_<id>.json for the optimizer.
 */
import type { ResolvedConfig } from '../../config';
import { route } from '../../core/cardmarket';
import { domReady, errorMessage } from '../../core/util';
import { h } from '../../ui/dom';
import { addAction } from '../../ui/launcher';
import { toast } from '../../ui/toast';
import { showMergeRecap } from './recapModal';
import { checkResume, initRunner, resumeRun, showOtherTabNotice } from './runner';
import type { LoadedWishlist } from './types';

async function readWishlistFiles(files: FileList): Promise<LoadedWishlist[]> {
  const wishlists: LoadedWishlist[] = [];
  for (const file of Array.from(files)) {
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== 'object') throw new Error(`“${file.name}” does not contain a JSON object`);
    if (!Array.isArray(data.cards)) throw new Error(`“${file.name}” is missing the "cards" array`);
    if (data.cards.length === 0) throw new Error(`“${file.name}” contains no cards`);
    if (!data.id) throw new Error(`“${file.name}” is missing the "id" field`);
    data.cards.forEach((c: any, i: number) => {
      if (!c.name || !c.link) throw new Error(`“${file.name}”, card #${i + 1} is missing "name" or "link"`);
      // Pre-v1.4 exports: single "language" string → "languages" array
      if (!Array.isArray(c.languages) && typeof c.language === 'string' && c.language) {
        console.warn(`[CardMarket Helper] ${file.name} / ${c.name}: old export format (single "language") auto-migrated — re-export the wishlist to avoid this.`);
        c.languages = [c.language];
      }
    });
    wishlists.push(data);
  }
  return wishlists;
}

function pickWishlistFiles(): void {
  const input = h('input', { type: 'file', accept: '.json,.wishlist.json', multiple: true, style: 'display:none' });
  input.addEventListener('change', async () => {
    try {
      if (input.files && input.files.length > 0) showMergeRecap(await readWishlistFiles(input.files));
    } catch (e) {
      toast('error', errorMessage(e), { title: 'Could not load the wishlist files' });
    } finally {
      input.remove();
    }
  });
  input.addEventListener('cancel', () => input.remove());
  document.body.appendChild(input);
  input.click();
}

export function setupOffersScraper(config: ResolvedConfig): void {
  initRunner(config.scraper);
  const verdict = checkResume();
  if (verdict === 'resume') {
    void domReady().then(resumeRun);
    return;
  }
  if (verdict === 'other-tab') showOtherTabNotice();

  addAction({
    id: 'offers-scrape',
    section: 'Tools',
    icon: '🔍',
    label: 'Scrape offers…',
    description: 'Pick .wishlist.json file(s) to collect offers for the optimizer',
    disabledReason: () => {
      if (checkResume() !== 'none') return 'A scrape is already running in another tab';
      if (!route.isMagic()) return 'Open any CardMarket Magic page first';
      return null;
    },
    run: pickWishlistFiles,
  });
}
