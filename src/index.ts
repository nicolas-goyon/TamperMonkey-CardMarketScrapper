/**
 * Root barrel, bundled by esbuild -> dist/cardmarket-helper.js and exposed as
 * window.CardmarketHelper (see scripts/build.mjs). The loader userscript
 * (userscripts/cardmarket-helper.user.js) @requires the bundle and calls
 * init({ ...config }) — that config object is the only thing a user edits.
 *
 * Layout: core/ (Tampermonkey + CardMarket glue, no UI), ui/ (shadow-DOM UI
 * kit: launcher, job panel, modal, toasts), features/ (one module per tool).
 */
import { CardmarketHelperConfig, resolveConfig } from './config';
import { registerMenuCommand } from './core/gm';
import { domReady } from './core/util';
import { setupCartExporter } from './features/cartExporter';
import { setupCartFiller } from './features/cartFiller';
import { setupOffersScraper } from './features/offersScraper';
import { setupWishlistExporter } from './features/wishlistExporter';
import { installLauncher, toggleMenu } from './ui/launcher';
import { mountUI } from './ui/root';

export type { CardmarketHelperConfig } from './config';
export const version = __VERSION__;

let initialized = false;

export function init(userConfig: CardmarketHelperConfig = {}): void {
  if (initialized) return;
  if (window.self !== window.top) return; // skip iframes
  initialized = true;

  const config = resolveConfig(userConfig);
  if (config.debug) console.log('[CardMarket Helper] v%s config', version, config);

  void domReady().then(() => {
    mountUI(config);
    installLauncher(version);
    registerMenuCommand('Open CardMarket Helper', () => toggleMenu(true));

    const setups: Array<[keyof typeof config.features, () => void]> = [
      ['wishlistExporter', () => setupWishlistExporter()],
      ['cartExporter', () => setupCartExporter()],
      ['offersScraper', () => setupOffersScraper(config)],
      ['cartFiller', () => setupCartFiller(config)],
    ];
    for (const [feature, setup] of setups) {
      if (!config.features[feature]) continue;
      try {
        setup();
      } catch (e) {
        console.error(`[CardMarket Helper] ${feature} failed to start:`, e);
      }
    }
  });
}
