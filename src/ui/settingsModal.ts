/**
 * ⚙ Settings panel: edits the user configuration stored in Tampermonkey
 * (src/settings.ts). Changes apply on the next page load ("Save & reload").
 */
import { CardmarketHelperConfig, Corner, DEFAULT_USER_CONFIG, SpeedPreset } from '../config';
import { loadUserConfig, resetUserConfig, saveUserConfig } from '../settings';
import { h } from './dom';
import { openModal } from './modal';
import { toast } from './toast';

const REPO_URL = 'https://github.com/nicolas-goyon/TamperMonkey-CardMarketScrapper';

const SPEEDS: Array<[SpeedPreset, string]> = [
  ['safe', 'Safe — slowest, lowest rate-limit risk'],
  ['balanced', 'Balanced (default)'],
  ['fast', 'Fast — higher rate-limit risk'],
];
const CORNERS: Array<[Corner, string]> = [
  ['bottom-right', 'Bottom right'], ['bottom-left', 'Bottom left'], ['top-right', 'Top right'], ['top-left', 'Top left'],
];
const THEMES: Array<['auto' | 'light' | 'dark', string]> = [['auto', 'Follow CardMarket'], ['light', 'Light'], ['dark', 'Dark']];

function select<T extends string>(options: Array<[T, string]>, value: T | undefined, id: string): HTMLSelectElement {
  return h('select', { class: 'control', id }, options.map(([v, label]) => h('option', { value: v, selected: v === value }, label)));
}

function numberInput(id: string, value: number | null | undefined, attrs: { min?: number; max?: number; placeholder?: string } = {}): HTMLInputElement {
  return h('input', {
    class: 'control', type: 'number', id,
    value: value === null || value === undefined ? '' : String(value),
    min: attrs.min !== undefined ? String(attrs.min) : undefined,
    max: attrs.max !== undefined ? String(attrs.max) : undefined,
    placeholder: attrs.placeholder,
  });
}

function field(label: string, control: HTMLElement, hint?: string): HTMLElement {
  return h('label', { class: 'field' },
    h('span', { class: 'field-label' }, label),
    control,
    hint ? h('span', { class: 'field-hint' }, hint) : null);
}

function toggle(label: string, checked: boolean, id: string): [HTMLLabelElement, HTMLInputElement] {
  const input = h('input', { type: 'checkbox', id, checked });
  return [h('label', { class: 'toggle' }, input, h('span', null, label)), input];
}

function jsonArea(id: string, value: unknown): HTMLTextAreaElement {
  return h('textarea', { class: 'control code', id, rows: '3', spellcheck: 'false', placeholder: '{ "cardNavigation": { "min": 1000, "max": 1500 } }' },
    value && Object.keys(value as object).length ? JSON.stringify(value, null, 2) : '');
}

function parseDelays(text: string, label: string): Record<string, { min: number; max: number }> | undefined {
  if (!text.trim()) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${label}: not valid JSON`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`${label}: expected an object`);
  for (const [key, range] of Object.entries(parsed as Record<string, any>)) {
    if (!range || typeof range.min !== 'number' || typeof range.max !== 'number' || range.min < 0 || range.max < range.min) {
      throw new Error(`${label}: "${key}" needs { "min": number, "max": number } with 0 ≤ min ≤ max`);
    }
  }
  return parsed as Record<string, { min: number; max: number }>;
}

function intOrDefault(input: HTMLInputElement, fallback: number, min: number, max: number): number {
  const n = parseInt(input.value, 10);
  return isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
}

export function openSettings(version: string): void {
  const saved = loadUserConfig();
  const d = DEFAULT_USER_CONFIG;
  const features = { ...d.features, ...saved.features };
  const scraper = { ...d.scraper, ...saved.scraper };
  const cartFiller = { ...d.cartFiller, ...saved.cartFiller };
  const ui = { ...d.ui, ...saved.ui, offset: { ...d.ui.offset, ...saved.ui?.offset } };

  const [tWish, cWish] = toggle('Wishlist exporter', features.wishlistExporter !== false, 'cmh-f-wish');
  const [tScrape, cScrape] = toggle('Offers scraper', features.offersScraper !== false, 'cmh-f-scrape');
  const [tCart, cCart] = toggle('Shopping-cart exporter', features.cartExporter !== false, 'cmh-f-cart');
  const [tFill, cFill] = toggle('Cart filler', features.cartFiller !== false, 'cmh-f-fill');

  const sellerCountry = numberInput('cmh-country', scraper.sellerCountry, { min: 1, max: 999, placeholder: 'Any country' });
  const scraperSpeed = select(SPEEDS, scraper.speed, 'cmh-s-speed');
  const batch = numberInput('cmh-batch', scraper.expansionBatchSize, { min: 1, max: 30 });
  const autoDl = numberInput('cmh-autodl', scraper.autoDownloadEvery, { min: 0, max: 500 });
  const fillerSpeed = select(SPEEDS, cartFiller.speed, 'cmh-c-speed');
  const position = select(CORNERS, ui.position, 'cmh-pos');
  const theme = select(THEMES, ui.theme, 'cmh-theme');
  const offsetX = numberInput('cmh-ox', ui.offset.x, { min: 0, max: 2000 });
  const offsetY = numberInput('cmh-oy', ui.offset.y, { min: 0, max: 2000 });
  const scraperDelays = jsonArea('cmh-s-delays', saved.scraper?.delays);
  const fillerDelays = jsonArea('cmh-c-delays', saved.cartFiller?.delays);
  const [tDebug, cDebug] = toggle('Verbose console logging', !!saved.debug, 'cmh-debug');
  const error = h('div', { class: 'callout danger', role: 'alert', hidden: true });

  const collect = (): CardmarketHelperConfig => {
    const country = sellerCountry.value.trim();
    return {
      features: { wishlistExporter: cWish.checked, offersScraper: cScrape.checked, cartExporter: cCart.checked, cartFiller: cFill.checked },
      scraper: {
        sellerCountry: country === '' ? null : intOrDefault(sellerCountry, 12, 1, 999),
        speed: scraperSpeed.value as SpeedPreset,
        expansionBatchSize: intOrDefault(batch, 5, 1, 30),
        autoDownloadEvery: intOrDefault(autoDl, 5, 0, 500),
        delays: parseDelays(scraperDelays.value, 'Scraper delays'),
      },
      cartFiller: { speed: fillerSpeed.value as SpeedPreset, delays: parseDelays(fillerDelays.value, 'Cart filler delays') },
      ui: {
        position: position.value as Corner,
        theme: theme.value as 'auto' | 'light' | 'dark',
        offset: { x: intOrDefault(offsetX, 0, 0, 2000), y: intOrDefault(offsetY, 0, 0, 2000) },
      },
      debug: cDebug.checked,
    };
  };

  const save = (reload: boolean) => {
    try {
      saveUserConfig(collect());
    } catch (e) {
      error.textContent = e instanceof Error ? e.message : String(e);
      error.hidden = false;
      return;
    }
    modal.close();
    if (reload) window.location.reload();
    else toast('success', 'Settings saved — they apply on the next page load.');
  };

  const section = (title: string, ...children: HTMLElement[]) =>
    h('section', { class: 'settings-section' }, h('h3', null, title), ...children);

  const modal = openModal({
    title: 'CardMarket Helper settings',
    subtitle: h('span', null, `Version ${version} · updates install automatically through Tampermonkey · `,
      h('a', { href: `${REPO_URL}/releases`, target: '_blank', rel: 'noopener' }, 'release notes')),
    body: h('div', { class: 'settings' },
      error,
      section('Tools', h('div', { class: 'toggles' }, tWish, tScrape, tCart, tFill)),
      section('Offers scraper', h('div', { class: 'editor-grid' },
        field('Seller country', sellerCountry, 'CardMarket country id (12 = France); empty = any country'),
        field('Speed', scraperSpeed),
        field('Printings per page', batch, 'On /Cards/ pages, expansions fetched per request'),
        field('Partial download every', autoDl, 'cards (0 = never)'))),
      section('Cart filler', h('div', { class: 'editor-grid' }, field('Speed', fillerSpeed))),
      section('Interface', h('div', { class: 'editor-grid' },
        field('Button corner', position),
        field('Theme', theme),
        field('Horizontal offset (px)', offsetX),
        field('Vertical offset (px)', offsetY, 'e.g. 60 to dodge a chat widget'))),
      h('details', { class: 'settings-section' },
        h('summary', null, 'Advanced'),
        h('div', { class: 'stack', style: 'margin-top:10px' },
          field('Scraper delay overrides (ms, JSON)', scraperDelays,
            'Keys: initialPageLoad, betweenLoadMore, afterLoadingComplete, cardNavigation, firstScrape'),
          field('Cart filler delay overrides (ms, JSON)', fillerDelays, 'Keys: initialPageLoad, betweenCartAdds, betweenNavigation'),
          tDebug))),
    wide: false,
    footer: [
      h('button', {
        class: 'btn',
        onClick: () => {
          if (!confirm('Reset every setting to its default?')) return;
          resetUserConfig();
          modal.close();
          toast('success', 'Settings reset — they apply on the next page load.');
        },
      }, 'Reset to defaults'),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn', onClick: () => save(false) }, 'Save'),
      h('button', { class: 'btn primary', onClick: () => save(true) }, 'Save & reload'),
    ],
  });
}
